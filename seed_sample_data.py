from pathlib import Path
from dotenv import load_dotenv

# Load env variables first
load_dotenv(Path(__file__).parent / ".env")

import bcrypt
from sqlmodel import Session, select, delete
from backend.database import Role, User, engine, CallRecording, CallInsight, EmotionTrajectory


def pw(first_name: str) -> str:
    return bcrypt.hashpw(f"{first_name}@123".encode(), bcrypt.gensalt()).decode()


def main() -> None:
    print("Seeding database with production-grade user roster...")
    with Session(engine) as s:
        # Wipe old call data and users for a clean state
        s.exec(delete(EmotionTrajectory))
        s.exec(delete(CallInsight))
        s.exec(delete(CallRecording))
        for u in s.exec(select(User)).all():
            s.delete(u)
        s.commit()
        print("Cleared existing database tables successfully.")

        # 1. Admin & Director
        admin = User(full_name="TFC Admin", email="admin@thankyouforcalling.com", password_hash=pw("Admin"), role=Role.ADMIN)
        director = User(full_name="Sanjay Bose", email="sanjay.bose@thankyouforcalling.com", password_hash=pw("Sanjay"), role=Role.DIRECTOR)
        s.add(admin)
        s.add(director)
        s.flush()
        print(f"Created Admin: {admin.email} (Password: Admin@123)")
        print(f"Created Director: {director.email} (Password: Sanjay@123)")

        # 2. Team Leaders
        tl_configs = [
            ("Rahul Sharma", "rahul.sharma@thankyouforcalling.com"),
            ("Priya Mehta", "priya.mehta@thankyouforcalling.com"),
            ("Arjun Nair", "arjun.nair@thankyouforcalling.com"),
        ]
        tls = {}
        for name, email in tl_configs:
            first = name.split()[0]
            tl = User(full_name=name, email=email, password_hash=pw(first), role=Role.TEAM_LEADER)
            s.add(tl)
            s.flush()
            s.refresh(tl)
            tls[email] = tl.id
            print(f"Created Team Leader: {email} (Password: {first}@123)")

        # 3. Advisors (5 per Team Leader)
        advisors = [
            ("Aanya Verma", "aanya.v@thankyouforcalling.com", "rahul.sharma@thankyouforcalling.com"),
            ("Karan Patel", "karan.p@thankyouforcalling.com", "rahul.sharma@thankyouforcalling.com"),
            ("Disha Singh", "disha.s@thankyouforcalling.com", "rahul.sharma@thankyouforcalling.com"),
            ("Raj Kumar", "raj.k@thankyouforcalling.com", "rahul.sharma@thankyouforcalling.com"),
            ("Meena Rao", "meena.r@thankyouforcalling.com", "rahul.sharma@thankyouforcalling.com"),
            ("Vikram Gupta", "vikram.g@thankyouforcalling.com", "priya.mehta@thankyouforcalling.com"),
            ("Sonal Joshi", "sonal.j@thankyouforcalling.com", "priya.mehta@thankyouforcalling.com"),
            ("Amit Shah", "amit.s@thankyouforcalling.com", "priya.mehta@thankyouforcalling.com"),
            ("Neha Das", "neha.d@thankyouforcalling.com", "priya.mehta@thankyouforcalling.com"),
            ("Rohit Nair", "rohit.n@thankyouforcalling.com", "priya.mehta@thankyouforcalling.com"),
            ("Kavya Iyer", "kavya.i@thankyouforcalling.com", "arjun.nair@thankyouforcalling.com"),
            ("Dev Kapoor", "dev.k@thankyouforcalling.com", "arjun.nair@thankyouforcalling.com"),
            ("Simran Khan", "simran.k@thankyouforcalling.com", "arjun.nair@thankyouforcalling.com"),
            ("Varun Malhotra", "varun.m@thankyouforcalling.com", "arjun.nair@thankyouforcalling.com"),
            ("Tanya Verma", "tanya.v@thankyouforcalling.com", "arjun.nair@thankyouforcalling.com"),
        ]

        for name, email, tl_email in advisors:
            first = name.split()[0]
            adv = User(full_name=name, email=email, password_hash=pw(first), role=Role.ADVISOR, team_id=tls[tl_email])
            s.add(adv)
            print(f"  Created Advisor: {email} -> Team Leader: {tl_email} (Password: {first}@123)")

        s.commit()
        total_users = len(s.exec(select(User)).all())
        print(f"\nSuccessfully seeded {total_users} users into PostgreSQL.")


if __name__ == "__main__":
    main()
