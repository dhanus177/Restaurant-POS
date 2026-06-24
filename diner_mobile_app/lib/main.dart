import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

void main() {
  runApp(const DinerMobileApp());
}

class DinerMobileApp extends StatelessWidget {
  const DinerMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dine-In Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const DineInOrderPage(),
    );
  }
}

class MenuItemModel {
  final String id;
  final String name;
  final double price;
  final bool isAvailable;

  MenuItemModel({
    required this.id,
    required this.name,
    required this.price,
    required this.isAvailable,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    return MenuItemModel(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0,
      isAvailable: json['isAvailable'] == true,
    );
  }
}

class TableModel {
  final String id;
  final String name;
  final int seats;
  final String status;

  TableModel({
    required this.id,
    required this.name,
    required this.seats,
    required this.status,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      seats: (json['seats'] as num?)?.toInt() ?? 0,
      status: (json['status'] ?? '').toString(),
    );
  }
}

class CartItem {
  final MenuItemModel item;
  int quantity;

  CartItem({required this.item, this.quantity = 1});

  double get lineTotal => item.price * quantity;
}

class PosApiClient {
  PosApiClient(this.baseUrl);

  final String baseUrl;

  Future<List<MenuItemModel>> fetchMenu() async {
    final data = await _getJson('/api/menu-items') as List<dynamic>;
    return data
        .map((e) => MenuItemModel.fromJson((e as Map).cast<String, dynamic>()))
        .where((e) => e.isAvailable)
        .toList();
  }

  Future<List<TableModel>> fetchTables() async {
    final data = await _getJson('/api/tables') as List<dynamic>;
    return data
        .map((e) => TableModel.fromJson((e as Map).cast<String, dynamic>()))
        .where((t) => t.status == 'available')
        .toList();
  }

  Future<void> submitDinerOrder({
    required String tableId,
    required String tableName,
    required int customerCount,
    required List<CartItem> cart,
  }) async {
    final currentOrders = await _getJson('/api/orders') as List<dynamic>;
    final maxOrderNumber = currentOrders
        .map((e) => ((e as Map)['orderNumber'] as num?)?.toInt() ?? 0)
        .fold<int>(100, (a, b) => a > b ? a : b);

    final subtotal = cart.fold<double>(0, (sum, c) => sum + c.lineTotal);
    const taxRate = 10.0;
    final tax = subtotal * (taxRate / 100);
    final total = subtotal + tax;
    final now = DateTime.now().toIso8601String();
    final orderId = 'mobile-order-${DateTime.now().millisecondsSinceEpoch}';

    final payload = {
      'id': orderId,
      'orderNumber': maxOrderNumber + 1,
      'tableId': tableId,
      'tableName': '$tableName • $customerCount pax • Diner Mobile',
      'items': cart
          .map(
            (c) => {
              'id': 'item-${DateTime.now().microsecondsSinceEpoch}-${c.item.id}',
              'menuItemId': c.item.id,
              'name': c.item.name,
              'quantity': c.quantity,
              'price': c.item.price,
              'modifiers': <Map<String, dynamic>>[],
            },
          )
          .toList(),
      'subtotal': subtotal,
      'tax': tax,
      'total': total,
      'status': 'pending',
      'paymentStatus': 'pending',
      'createdAt': now,
      'updatedAt': now,
      'createdBy': 'mobile-diner',
    };

    await _postJson('/api/orders', payload);
  }

  Future<dynamic> _getJson(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final client = HttpClient();
    final req = await client.getUrl(uri);
    req.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final res = await req.close();
    final body = await utf8.decodeStream(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw HttpException('GET $path failed (${res.statusCode}): $body');
    }
    return jsonDecode(body);
  }

  Future<void> _postJson(String path, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl$path');
    final client = HttpClient();
    final req = await client.postUrl(uri);
    req.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
    req.write(jsonEncode(payload));
    final res = await req.close();
    final body = await utf8.decodeStream(res);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw HttpException('POST $path failed (${res.statusCode}): $body');
    }
  }
}

class DineInOrderPage extends StatefulWidget {
  const DineInOrderPage({super.key});

  @override
  State<DineInOrderPage> createState() => _DineInOrderPageState();
}

class _DineInOrderPageState extends State<DineInOrderPage> {
  final TextEditingController _baseUrlController =
      TextEditingController(text: 'http://10.0.2.2:3000');

  PosApiClient? _api;
  bool _loading = false;
  bool _submitting = false;
  List<MenuItemModel> _menu = [];
  List<TableModel> _tables = [];
  final List<CartItem> _cart = [];
  TableModel? _selectedTable;
  int _customerCount = 2;

  @override
  void initState() {
    super.initState();
    _connectAndLoad();
  }

  double get _subtotal => _cart.fold<double>(0, (sum, c) => sum + c.lineTotal);
  double get _tax => _subtotal * 0.10;
  double get _total => _subtotal + _tax;
  double get _perCustomer => _customerCount > 0 ? _total / _customerCount : _total;

  Future<void> _connectAndLoad() async {
    setState(() => _loading = true);
    try {
      final api = PosApiClient(_baseUrlController.text.trim());
      final results = await Future.wait([api.fetchMenu(), api.fetchTables()]);
      setState(() {
        _api = api;
        _menu = results[0] as List<MenuItemModel>;
        _tables = results[1] as List<TableModel>;
        _selectedTable = _tables.where((t) => t.seats >= _customerCount).firstOrNull;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Connection failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _addItem(MenuItemModel item) {
    final idx = _cart.indexWhere((c) => c.item.id == item.id);
    setState(() {
      if (idx >= 0) {
        _cart[idx].quantity += 1;
      } else {
        _cart.add(CartItem(item: item));
      }
    });
  }

  void _decrementItem(CartItem cartItem) {
    setState(() {
      cartItem.quantity -= 1;
      if (cartItem.quantity <= 0) {
        _cart.remove(cartItem);
      }
    });
  }

  Future<void> _submitOrder() async {
    if (_api == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Not connected to POS API yet.')),
      );
      return;
    }
    if (_selectedTable == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a table.')),
      );
      return;
    }
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart is empty.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await _api!.submitDinerOrder(
        tableId: _selectedTable!.id,
        tableName: _selectedTable!.name,
        customerCount: _customerCount,
        cart: _cart,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order sent to billing/pay counter successfully.')),
      );

      setState(() => _cart.clear());
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order submit failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fittingTables = _tables.where((t) => t.seats >= _customerCount).toList();
    if (_selectedTable != null && !fittingTables.any((t) => t.id == _selectedTable!.id)) {
      _selectedTable = fittingTables.isEmpty ? null : fittingTables.first;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dine-In Mobile Ordering'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _connectAndLoad,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('POS API URL', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _baseUrlController,
                            decoration: const InputDecoration(
                              hintText: 'http://10.0.2.2:3000',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _connectAndLoad,
                                  icon: const Icon(Icons.sync),
                                  label: const Text('Reconnect'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Dine-In Setup', style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Text('Customers: '),
                              IconButton(
                                onPressed: _customerCount > 1
                                    ? () => setState(() => _customerCount -= 1)
                                    : null,
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text('$_customerCount'),
                              IconButton(
                                onPressed: () => setState(() => _customerCount += 1),
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                            ],
                          ),
                          DropdownButtonFormField<String>(
                            key: ValueKey('table-${_selectedTable?.id ?? 'none'}-$_customerCount'),
                            initialValue: _selectedTable?.id,
                            decoration: const InputDecoration(
                              labelText: 'Table',
                              border: OutlineInputBorder(),
                              isDense: true,
                            ),
                            items: fittingTables
                                .map(
                                  (t) => DropdownMenuItem<String>(
                                    value: t.id,
                                    child: Text('${t.name} (${t.seats} seats)'),
                                  ),
                                )
                                .toList(),
                            onChanged: (id) {
                              setState(() {
                                _selectedTable = fittingTables.firstWhere((t) => t.id == id);
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text('Menu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  ..._menu.map(
                    (m) => Card(
                      child: ListTile(
                        title: Text(m.name),
                        subtitle: Text('\$${m.price.toStringAsFixed(2)}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.add_shopping_cart),
                          onPressed: () => _addItem(m),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text('Cart', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  if (_cart.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No items in cart.'),
                      ),
                    )
                  else
                    ..._cart.map(
                      (c) => Card(
                        child: ListTile(
                          title: Text(c.item.name),
                          subtitle: Text('Qty: ${c.quantity}'),
                          trailing: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            children: [
                              Text('\$${c.lineTotal.toStringAsFixed(2)}'),
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline),
                                onPressed: () => _decrementItem(c),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline),
                                onPressed: () => _addItem(c.item),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          _SummaryRow(label: 'Subtotal', value: _subtotal),
                          _SummaryRow(label: 'Tax (10%)', value: _tax),
                          _SummaryRow(label: 'Total', value: _total, bold: true),
                          _SummaryRow(
                            label: 'Per customer ($_customerCount)',
                            value: _perCustomer,
                            highlight: true,
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: _submitting ? null : _submitOrder,
                              icon: const Icon(Icons.send),
                              label: Text(_submitting ? 'Submitting...' : 'Send Order to Billing'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.highlight = false,
  });

  final String label;
  final double value;
  final bool bold;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      color: highlight ? Theme.of(context).colorScheme.primary : null,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text('\$${value.toStringAsFixed(2)}', style: style),
        ],
      ),
    );
  }
}

extension FirstOrNullExt<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
