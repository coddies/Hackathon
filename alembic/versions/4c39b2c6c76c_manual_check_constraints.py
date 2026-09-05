"""Manual check constraints

Revision ID: 4c39b2c6c76c
Revises: d50a3e40c847
Create Date: 2026-09-06 02:38:28.108708

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c39b2c6c76c'
down_revision: Union[str, None] = 'd50a3e40c847'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint('check_available_seats_positive', 'seat_inventory', 'available_seats >= 0')
    op.create_check_constraint('check_held_seats_positive', 'seat_inventory', 'held_seats >= 0')


def downgrade() -> None:
    op.drop_constraint('check_available_seats_positive', 'seat_inventory', type_='check')
    op.drop_constraint('check_held_seats_positive', 'seat_inventory', type_='check')
