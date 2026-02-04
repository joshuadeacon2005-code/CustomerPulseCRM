\copy (SELECT * FROM sales ORDER BY date DESC) TO '/tmp/sales_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM interactions ORDER BY date DESC) TO '/tmp/interactions_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM customers ORDER BY name) TO '/tmp/customers_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM users ORDER BY name) TO '/tmp/users_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM monthly_targets ORDER BY year DESC, month DESC) TO '/tmp/monthly_targets_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM customer_monthly_targets ORDER BY year DESC, month DESC) TO '/tmp/customer_monthly_targets_export.csv' WITH CSV HEADER;
\copy (SELECT * FROM offices ORDER BY name) TO '/tmp/offices_export.csv' WITH CSV HEADER;
