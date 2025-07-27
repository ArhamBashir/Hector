import csv
import sys
import os

# This is a bit of a trick to make the script able to import from the parent 'app' directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# This is a bit of a trick to make the script able to import from the parent 'app' directory
# This is a bit of a trick to make the script able to import from the parent 'app' directory
# This is a bit of a trick to make the script able to import from the parent 'app' directory

from app.db.session import SessionLocal
from app.db.models import MasterProduct

def import_products_from_csv(file_path: str):
    db = SessionLocal()
    try:
        with open(file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            products_to_add = []
            count = 0
            for row in reader:
                product = MasterProduct(
                    sku=row['sku'],
                    product_name=row['product_name'],
                    target_cost_per_unit=float(row['target_cost_per_unit']),
                    category=row['category'],
                    product_type=row['product_type']
                )
                products_to_add.append(product)
                count += 1

                # Commit in batches of 100 to be efficient
                if len(products_to_add) == 100:
                    db.add_all(products_to_add)
                    db.commit()
                    print(f"Committed {len(products_to_add)} products. Total: {count}")
                    products_to_add = []

            # Commit any remaining products
            if products_to_add:
                db.add_all(products_to_add)
                db.commit()
                print(f"Committed final {len(products_to_add)} products. Total: {count}")

        print("\nProduct import completed successfully!")

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_products.py <path_to_csv_file>")
    else:
        csv_file_path = sys.argv[1]
        import_products_from_csv(csv_file_path)