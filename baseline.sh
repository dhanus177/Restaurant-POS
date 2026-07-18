#!/bin/bash
set -e

echo "Baselining Prisma migrations..."

npx prisma migrate resolve --applied 20260410065409_init
npx prisma migrate resolve --applied 20260606090000_add_product_recipes
npx prisma migrate resolve --applied 20260616063633_add_category_fields
npx prisma migrate resolve --applied 20260702120000_add_license_support
npx prisma migrate resolve --applied 20260702130000_add_session_table
npx prisma migrate resolve --applied 20260702160000_add_customers
npx prisma migrate resolve --applied 20260702162118_add_customers
npx prisma migrate resolve --applied 20260702193000_customer_loyalty
npx prisma migrate resolve --applied 20260704000000_cash_drawer_balance
npx prisma migrate resolve --applied 20260704003000_cash_drawer_report
npx prisma migrate resolve --applied 20260704010000_menu_item_service_charge_flag
npx prisma migrate resolve --applied 20260704014000_supplier_ledger_entries
npx prisma migrate resolve --applied 20260704020000_cash_drawer_expenses
npx prisma migrate resolve --applied 20260704030000_audit_logs
npx prisma migrate resolve --applied 20260704042000_backup_schedule_shift
npx prisma migrate resolve --applied 20260705001000_settings_customer_requirement
npx prisma migrate resolve --applied 20260705002000_customer_requirement_default_optional
npx prisma migrate resolve --applied 20260710093000_settings_feature_locks
npx prisma migrate resolve --applied 20260710112000_whatsapp_daily_reports
npx prisma migrate resolve --applied 20260714090000_add_waiter_chair_orders
npx prisma migrate resolve --applied 20260714100000_add_payment_collector_to_orders
npx prisma migrate resolve --applied 20260715093000_supplier_payment_methods_and_bill_items
npx prisma migrate resolve --applied 20260715113000_add_menu_item_prep_station
npx prisma migrate resolve --applied 20260715133000_add_custom_roles_to_settings
npx prisma migrate resolve --applied 20260715150000_add_waiter_visible_categories_to_settings

echo "✅ All migrations marked as applied."
echo "Now run:"
echo "npx prisma migrate deploy"
