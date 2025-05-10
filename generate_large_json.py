import json
import uuid
import random
import string
import os

def generate_random_string(length):
    """Generates a random string of fixed length."""
    letters = string.ascii_lowercase + string.digits + " " * 10  # Add spaces for more realistic text
    return ''.join(random.choice(letters) for i in range(length))

def generate_json_object(index):
    """Generates a single JSON object."""
    return {
        "id": str(uuid.uuid4()),
        "record_index": index,
        "value_float": random.uniform(1.0, 100000.0),
        "value_int": random.randint(1, 1000000),
        "text_short": generate_random_string(random.randint(20, 50)),
        "text_medium": generate_random_string(random.randint(50, 150)),
        "flag": random.choice([True, False, None]),
        "nested_data": {
            "attr1": generate_random_string(10),
            "attr2": random.randint(0,100),
            "sub_array": [generate_random_string(5) for _ in range(random.randint(1,3))]
        }
    }

# Estimate bytes per object:
# UUID: 36
# "id": "", : 8 => 44
# "record_index": 123456, : ~25
# "value_float": 12345.6789, : ~25
# "value_int": 123456, : ~20
# "text_short": "...", : ~60 (avg 35 chars + key/quotes)
# "text_medium": "...", : ~160 (avg 100 chars + key/quotes)
# "flag": true, : ~15
# "nested_data": {...} : ~150
# Commas, braces: ~5
# Total per object roughly: 44+25+25+20+60+160+15+150+5 = ~504 bytes

# Target size: 30MB = 30 * 1024 * 1024 bytes = 31,457,280 bytes
# Number of objects: 31,457,280 / 504 bytes/object = approx 62,415 objects

num_objects = 62500 # Adjusted for a bit of buffer and simpler number
filename = "tests/large_test.json"
data_list = []

print(f"Generating {num_objects} objects for {filename}...")

for i in range(num_objects):
    data_list.append(generate_json_object(i))
    if (i + 1) % 1000 == 0:
        print(f"Generated {i + 1}/{num_objects} objects...")

# Root structure
root_object = {
    "metadata": {
        "description": "Large JSON test file",
        "object_count": num_objects,
        "generated_on": str(uuid.uuid4()) # Just to add some unique string
    },
    "records": data_list
}

print(f"Writing JSON data to {filename}...")
try:
    with open(filename, 'w') as f:
        json.dump(root_object, f) # Use dump for efficiency with large files
    print(f"Successfully generated {filename} (approx. 30MB).")
    file_size = os.path.getsize(filename)
    print(f"Actual file size: {file_size / (1024 * 1024):.2f} MB")
except IOError as e:
    print(f"Error writing file: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
