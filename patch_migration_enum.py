import re

migration_file = r'Z:\Hackthon\alembic\versions\15cf50794cb7_align_schema_with_models_final.py'
with open(migration_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Add postgresql_using for itineraries.status
content = content.replace(
    "existing_server_default=sa.text(\"'PENDING'::character varying\"))",
    "existing_server_default=sa.text(\"'PENDING'::character varying\"), postgresql_using='status::itinerary_status')"
)

# Add postgresql_using for itinerary_legs.seat_class
content = content.replace(
    "type_=sa.Enum('FIRST', 'BUSINESS', 'ECONOMY', name='seat_class'),\n               existing_nullable=False)",
    "type_=sa.Enum('FIRST', 'BUSINESS', 'ECONOMY', name='seat_class'),\n               existing_nullable=False, postgresql_using='seat_class::seat_class')"
)

# Add postgresql_using for itinerary_legs.fare_type
content = content.replace(
    "type_=sa.Enum('BASIC', 'FLEXIBLE', name='fare_type'),\n               existing_nullable=False)",
    "type_=sa.Enum('BASIC', 'FLEXIBLE', name='fare_type'),\n               existing_nullable=False, postgresql_using='fare_type::fare_type')"
)

# Add postgresql_using for schedule_changes.rebooking_rule
content = content.replace(
    "existing_server_default=sa.text(\"'NONE'::character varying\"))",
    "existing_server_default=sa.text(\"'NONE'::character varying\"), postgresql_using='rebooking_rule::rebooking_rule')"
)

with open(migration_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Migration patched successfully.")
