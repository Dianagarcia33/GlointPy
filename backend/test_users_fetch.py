import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.services.user_service import UserService
from src.schemas.user import UserResponse
from src.core.config import settings

async def test_fetch():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            users = await UserService.get_all_users(session)
            print(f"Total users fetched: {len(users)}")
            for u in users:
                try:
                    UserResponse.model_validate(u)
                except Exception as e:
                    print(f"Error validating user {u.id} ({u.email}): {e}")
                    return
            print("All users validated successfully.")
        except Exception as e:
            print(f"Exception during fetch: {e}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
