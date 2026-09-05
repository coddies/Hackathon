import re

migration_file = r'Z:\Hackthon\alembic\versions\a1d25bdc4bc6_align_schema_with_models_final.py'
with open(migration_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace users.password_hash -> hashed_password
content = content.replace("op.add_column('users', sa.Column('hashed_password', sa.String(length=255), nullable=False))", "")
content = content.replace("op.drop_column('users', 'password_hash')", "op.alter_column('users', 'password_hash', new_column_name='hashed_password', existing_type=sa.String(length=255), nullable=False)")

# Replace seat_inventory.booking_cutoff_minutes -> booking_cutoff_hours
content = content.replace("op.add_column('seat_inventory', sa.Column('booking_cutoff_hours', sa.Integer(), nullable=False))", "")
content = content.replace("op.drop_column('seat_inventory', 'booking_cutoff_minutes')", "op.alter_column('seat_inventory', 'booking_cutoff_minutes', new_column_name='booking_cutoff_hours', existing_type=sa.Integer(), nullable=False)")

# Replace seat_holds.expires_at -> hold_expires_at
content = content.replace("op.add_column('seat_holds', sa.Column('hold_expires_at', sa.DateTime(timezone=True), nullable=False))", "")
content = content.replace("op.drop_column('seat_holds', 'expires_at')", "op.alter_column('seat_holds', 'expires_at', new_column_name='hold_expires_at', existing_type=sa.DateTime(timezone=True), nullable=False)")

# Replace passengers.full_name -> name
content = content.replace("op.add_column('passengers', sa.Column('name', sa.String(length=255), nullable=False))", "")
content = content.replace("op.drop_column('passengers', 'full_name')", "op.alter_column('passengers', 'full_name', new_column_name='name', existing_type=sa.String(length=255), nullable=False)")

# Fix waitlist_entries non-nullable new columns (add server_default)
content = content.replace("op.add_column('waitlist_entries', sa.Column('passenger_name', sa.String(length=255), nullable=False))", "op.add_column('waitlist_entries', sa.Column('passenger_name', sa.String(length=255), nullable=False, server_default='Unknown'))")
content = content.replace("op.add_column('waitlist_entries', sa.Column('email', sa.String(length=255), nullable=False))", "op.add_column('waitlist_entries', sa.Column('email', sa.String(length=255), nullable=False, server_default='unknown@example.com'))")
content = content.replace("op.add_column('waitlist_entries', sa.Column('loyalty_rank', sa.Integer(), nullable=False))", "op.add_column('waitlist_entries', sa.Column('loyalty_rank', sa.Integer(), nullable=False, server_default='5'))")
content = content.replace("op.add_column('waitlist_entries', sa.Column('fare_type_rank', sa.Integer(), nullable=False))", "op.add_column('waitlist_entries', sa.Column('fare_type_rank', sa.Integer(), nullable=False, server_default='2'))")
content = content.replace("op.add_column('waitlist_entries', sa.Column('position', sa.Integer(), nullable=False))", "op.add_column('waitlist_entries', sa.Column('position', sa.Integer(), nullable=False, server_default='0'))")

with open(migration_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Migration patched successfully.")
