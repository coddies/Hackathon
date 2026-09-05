import os
import re

models_dir = 'app/models'
for fname in os.listdir(models_dir):
    if fname.endswith('.py'):
        path = os.path.join(models_dir, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We need to find Enum(Something) and replace with Enum(Something, name='something_snake_case')
        def replacer(match):
            cls_name = match.group(1)
            # convert CamelCase to snake_case
            snake_name = re.sub(r'(?<!^)(?=[A-Z])', '_', cls_name).lower()
            return f"Enum({cls_name}, name='{snake_name}')"
            
        new_content = re.sub(r'Enum\(([A-Za-z0-9_]+)\)', replacer, content)
        
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {fname}")

print("Done")
