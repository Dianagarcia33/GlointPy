from sqlalchemy.orm import selectinload
from src.models.user import User
from src.models.security import Role
from sqlalchemy.future import select

stmt = select(User).options(selectinload(User.roles).selectinload(Role.permissions))
print(stmt)
