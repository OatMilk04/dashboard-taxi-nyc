import pandas as pd
from sqlalchemy import create_engine, text
import os

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
# Si estás en NEON (Nube), pega tu URL aquí abajo:
# db_url = "postgres://adrian:.....@neon.tech/..."

# Si sigues en LOCAL (Tu máquina virtual):
db_url = "postgresql://neondb_owner:npg_PMCYzxG3f4aH@ep-long-queen-ah64gnzg.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

engine = create_engine(db_url)

# --- CONFIGURACIÓN DE DESCARGA ---
ANIO = "2024"  # <--- Actualizado a tu enlace
MESES = [f"{i:02d}" for i in range(1, 13)] # ["01", "02", ... "12"]
SAMPLE_SIZE = 200000 # 160k x 12 = ~1.92 Millones de viajes

def procesar_anio():
    print(f"🔥 INICIANDO CARGA MASIVA DEL AÑO {ANIO} 🔥")
    print(f"🎯 Meta: ~{SAMPLE_SIZE * 12:,} viajes en total.\n")
    
    # 1. LIMPIAR LA BASE DE DATOS (Para empezar limpio y sin duplicados)
    print("🧹 Limpiando tabla 'trips' antigua...")
    with engine.connect() as conn:
        try:
            # Usamos TRUNCATE que es rapidísimo
            conn.execute(text("TRUNCATE TABLE trips;"))
            conn.commit()
        except:
            print("   (Tabla nueva o vacía, continuando...)")

    # 2. BUCLE AUTOMÁTICO (Mes por mes)
    for mes in MESES:
        # Construimos el nombre exacto del archivo basado en TU enlace
        nombre_archivo = f"yellow_tripdata_{ANIO}-{mes}.parquet"
        url_descarga = f"https://d37ci6vzurychx.cloudfront.net/trip-data/{nombre_archivo}"
        
        print(f"-----------------------------------")
        print(f"📅 Procesando: {mes}/{ANIO}")
        
        # A. Descargar
        print(f"⬇️  Descargando desde: {url_descarga}")
        resultado = os.system(f"curl -o {nombre_archivo} {url_descarga}")
        
        # Verificar si bajó bien (a veces curl falla si el internet parpadea)
        if resultado != 0 or not os.path.exists(nombre_archivo):
            print(f"❌ Error crítico descargando {mes}. Saltando...")
            continue

        try:
            # B. Leer con Pandas
            print("📖 Leyendo archivo Parquet...")
            df = pd.read_parquet(nombre_archivo)
            
            # C. Limpieza Rápida (Quitar nulos y errores)
            df = df.dropna(subset=['PULocationID', 'DOLocationID'])
            df = df[(df['trip_distance'] > 0) & (df['fare_amount'] > 0)]
            
            # D. Muestreo Aleatorio (Tomamos 160k al azar, no los primeros)
            if len(df) > SAMPLE_SIZE:
                df = df.sample(n=SAMPLE_SIZE, random_state=42)
                print(f"✂️  Seleccionados {SAMPLE_SIZE} viajes aleatorios.")
            else:
                print(f"⚠️  El mes tiene pocos datos ({len(df)}), se tomaron todos.")
            
            # E. Guardar en Base de Datos (APPEND = Sumar a lo que ya hay)
            print("🚀 Insertando en PostgreSQL...")
            df.to_sql('trips', engine, if_exists='append', index=False)
            
        except Exception as e:
            print(f"❌ Error procesando mes {mes}: {e}")
            
        finally:
            # F. ¡IMPORTANTE! Borrar el archivo gigante
            print(f"🗑️  Borrando {nombre_archivo} para liberar espacio...")
            if os.path.exists(nombre_archivo):
                os.remove(nombre_archivo)

    print("\n✅ ¡LISTO! Base de datos cargada con todo el año 2024.")

if __name__ == "__main__":
    procesar_anio()
