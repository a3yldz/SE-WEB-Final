"""
Seed script to populate 30 fire stations across İzmir, İstanbul, and Ankara.
Uses raw SQL to avoid SQLAlchemy ORM issues.
Run with: python seed_stations.py
"""

import os
import random
import uuid
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Station names suffix
STATION_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"]

def generate_stations():
    """Generate 30 fire stations with realistic coordinates."""
    stations = []
    
    # İzmir - Bornova (5 stations) - centered around 38.46°N, 27.21°E
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Bornova Station {name}",
            "İzmir - Bornova",
            38.46 + random.uniform(-0.01, 0.01),
            27.21 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    # İzmir - Bayraklı (5 stations)
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Bayraklı Station {name}",
            "İzmir - Bayraklı",
            38.46 + random.uniform(-0.01, 0.01),
            27.16 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    # İstanbul - Fatih (5 stations)
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Fatih Station {name}",
            "İstanbul - Fatih",
            41.01 + random.uniform(-0.01, 0.01),
            28.94 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    # İstanbul - Beykoz (5 stations)
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Beykoz Station {name}",
            "İstanbul - Beykoz",
            41.13 + random.uniform(-0.01, 0.01),
            29.10 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    # Ankara - Yenimahalle (5 stations)
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Yenimahalle Station {name}",
            "Ankara - Yenimahalle",
            39.96 + random.uniform(-0.01, 0.01),
            32.79 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    # Ankara - Keçiören (5 stations)
    for name in STATION_NAMES:
        stations.append((
            str(uuid.uuid4()),
            f"Keçiören Station {name}",
            "Ankara - Keçiören",
            40.00 + random.uniform(-0.01, 0.01),
            32.86 + random.uniform(-0.01, 0.01),
            "available"
        ))
    
    return stations


def seed_stations():
    """Insert stations into database using raw SQL."""
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Convert SQLAlchemy URL to psycopg2 format if needed
    if db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Check existing count
        cur.execute("SELECT COUNT(*) FROM fire_stations")
        existing = cur.fetchone()[0]
        print(f"📊 Current stations in DB: {existing}")
        
        # Generate new stations
        stations_data = generate_stations()
        
        # Insert stations using executemany
        insert_sql = """
            INSERT INTO fire_stations (id, name, district, latitude, longitude, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cur.executemany(insert_sql, stations_data)
        conn.commit()
        
        # Verify
        cur.execute("SELECT COUNT(*) FROM fire_stations")
        new_count = cur.fetchone()[0]
        print(f"✅ Successfully added {len(stations_data)} stations!")
        print(f"📊 Total stations now: {new_count}")
        
        # List by district
        print("\n📍 Stations by District:")
        cur.execute("SELECT district, COUNT(*) FROM fire_stations GROUP BY district ORDER BY district")
        for district, count in cur.fetchall():
            print(f"   • {district}: {count} stations")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("🚒 Fire Station Seeding Script")
    print("=" * 40)
    seed_stations()
