import re

migration_file = r'Z:\Hackthon\alembic\versions\a1d25bdc4bc6_align_schema_with_models_final.py'
with open(migration_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Match op.alter_column('table', 'column',\n               ...type_=sa.Enum(..., name='enum_name')
pattern = r"op\.alter_column\('([^']+)', '([^']+)',([\s\S]*?)type_=(sa\.Enum|postgresql\.ENUM)\(([^)]+name='([^']+)')\)([\s\S]*?existing_nullable=[A-Za-z]+(?:,[\s\S]*?existing_server_default=[^)]+\))?)"

def replacer(match):
    table = match.group(1)
    col = match.group(2)
    before_type = match.group(3)
    type_kind = match.group(4)
    enum_args = match.group(5)
    enum_name = match.group(6)
    after_type = match.group(7)
    
    # Check if postgresql_using is already there
    if 'postgresql_using' in after_type:
        return match.group(0)
    
    using_clause = f", postgresql_using='{col}::text::{enum_name}'"
    return f"op.alter_column('{table}', '{col}',{before_type}type_={type_kind}({enum_args}){after_type}{using_clause}"

new_content = re.sub(pattern, replacer, content)

# There are also some ENUMs mapped as type_=sa.VARCHAR.
pattern2 = r"op\.alter_column\('([^']+)', '([^']+)',([\s\S]*?)type_=sa\.VARCHAR\([^\)]+\)([\s\S]*?existing_server_default=[^)]+\))"
def replacer2(match):
    table = match.group(1)
    col = match.group(2)
    before_type = match.group(3)
    after_type = match.group(4)
    if 'postgresql_using' in after_type:
        return match.group(0)
    using_clause = f", postgresql_using='{col}::text'"
    return f"op.alter_column('{table}', '{col}',{before_type}type_=sa.VARCHAR(length=20){after_type}{using_clause}"
    
new_content = re.sub(pattern2, replacer2, new_content)

with open(migration_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Migration fully patched with postgresql_using.")
