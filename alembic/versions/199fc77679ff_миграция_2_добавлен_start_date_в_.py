"""миграция 2 - добавлен start_date в WaterConsumptionLog поправка 3

Revision ID: 199fc77679ff
Revises: 2073b7ecf35b
Create Date: 2025-04-12 18:23:52.825966

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '199fc77679ff'
down_revision: Union[str, None] = '2073b7ecf35b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
