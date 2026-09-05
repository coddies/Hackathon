"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-09-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='PASSENGER', nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # 2. flights
    op.create_table(
        'flights',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flight_number', sa.String(length=20), nullable=False),
        sa.Column('origin', sa.String(length=3), nullable=False),
        sa.Column('destination', sa.String(length=3), nullable=False),
        sa.Column('departure_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('arrival_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('aircraft_capacity', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='SCHEDULED', nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. seat_inventory
    op.create_table(
        'seat_inventory',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flight_id', sa.UUID(), nullable=False),
        sa.Column('seat_class', sa.String(length=20), nullable=False),
        sa.Column('total_seats', sa.Integer(), nullable=False),
        sa.Column('available_seats', sa.Integer(), nullable=False),
        sa.Column('held_seats', sa.Integer(), server_default='0', nullable=True),
        sa.Column('overbooking_policy', sa.String(length=50), server_default='HARD_NEVER_OVERSELL', nullable=True),
        sa.Column('overbooking_buffer', sa.Integer(), server_default='0', nullable=True),
        sa.Column('fare_basic', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('fare_flexible', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('booking_cutoff_hours', sa.Integer(), server_default='3', nullable=True),
        sa.Column('group_booking_policy', sa.String(length=50), server_default='FULL_FAIL', nullable=True),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('flight_id', 'seat_class')
    )

    # 4. itineraries
    op.create_table(
        'itineraries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(length=50), server_default='PENDING', nullable=True),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('locale', sa.String(length=10), server_default='en-US', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. itinerary_legs
    op.create_table(
        'itinerary_legs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('itinerary_id', sa.UUID(), nullable=False),
        sa.Column('flight_id', sa.UUID(), nullable=False),
        sa.Column('leg_order', sa.Integer(), nullable=False),
        sa.Column('seat_class', sa.String(length=20), nullable=False),
        sa.Column('fare_type', sa.String(length=20), nullable=False),
        sa.Column('passenger_count', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['itinerary_id'], ['itineraries.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. seat_holds
    op.create_table(
        'seat_holds',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flight_id', sa.UUID(), nullable=False),
        sa.Column('seat_class', sa.String(length=20), nullable=False),
        sa.Column('fare_type', sa.String(length=20), nullable=False),
        sa.Column('passenger_count', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='HELD', nullable=True),
        sa.Column('hold_started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('hold_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('itinerary_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['itinerary_id'], ['itineraries.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. bookings
    op.create_table(
        'bookings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('booking_reference', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('flight_id', sa.UUID(), nullable=False),
        sa.Column('seat_class', sa.String(length=20), nullable=False),
        sa.Column('fare_type', sa.String(length=20), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('status', sa.String(length=50), server_default='CONFIRMED', nullable=True),
        sa.Column('cancellation_policy', sa.String(length=50), nullable=False),
        sa.Column('hold_id', sa.UUID(), nullable=True),
        sa.Column('itinerary_id', sa.UUID(), nullable=True),
        sa.Column('airline_initiated', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('flight_cancellation_outcome', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['hold_id'], ['seat_holds.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['itinerary_id'], ['itineraries.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_reference')
    )

    # 8. passengers
    op.create_table(
        'passengers',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('booking_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('passport_number', sa.String(length=50), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='CONFIRMED', nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refund_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. waitlist_entries
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('flight_id', sa.UUID(), nullable=False),
        sa.Column('seat_class', sa.String(length=20), nullable=False),
        sa.Column('passenger_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('loyalty_tier', sa.String(length=20), server_default='NONE', nullable=True),
        sa.Column('fare_type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='WAITING', nullable=True),
        sa.Column('priority_score', sa.Integer(), server_default='0', nullable=True),
        sa.Column('loyalty_rank', sa.Integer(), server_default='5', nullable=True),
        sa.Column('fare_type_rank', sa.Integer(), server_default='2', nullable=True),
        sa.Column('position', sa.Integer(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('promoted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['flight_id'], ['flights.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. refunds
    op.create_table(
        'refunds',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('booking_id', sa.UUID(), nullable=False),
        sa.Column('passenger_id', sa.UUID(), nullable=True),
        sa.Column('refund_type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=True),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['passenger_id'], ['passengers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. travel_credits
    op.create_table(
        'travel_credits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('booking_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='USD', nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 12. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=True),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=True),
        sa.Column('old_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    op.create_index('ix_audit_actor', 'audit_logs', ['actor_id'], unique=False)
    op.create_index('ix_audit_created', 'audit_logs', ['created_at'], unique=False)

    # 13. idempotency_keys
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('route', sa.String(length=255), nullable=False),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('response_status', sa.Integer(), nullable=False),
        sa.Column('response_body', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key', 'route')
    )


def downgrade() -> None:
    op.drop_table('idempotency_keys')
    op.drop_index('ix_audit_created', table_name='audit_logs')
    op.drop_index('ix_audit_actor', table_name='audit_logs')
    op.drop_index('ix_audit_entity', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_table('travel_credits')
    op.drop_table('refunds')
    op.drop_table('waitlist_entries')
    op.drop_table('passengers')
    op.drop_table('bookings')
    op.drop_table('seat_holds')
    op.drop_table('itinerary_legs')
    op.drop_table('itineraries')
    op.drop_table('seat_inventory')
    op.drop_table('flights')
    op.drop_table('users')
