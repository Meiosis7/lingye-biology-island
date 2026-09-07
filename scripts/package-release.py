"""Build the game and package explicitly scoped release files."""
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
subprocess.run(['npm', 'run', 'build'], cwd=root, check=True)
output = root / '成品'
archive = output / '灵野图鉴-完整成品.zip'
source_files = ['index.html', 'README.md', 'DESIGN.md', 'package.json', 'package-lock.json']
for folder in ['src', 'tests', 'scripts', 'docs']:
    source_files += [str(f.relative_to(root)) for f in (root / folder).rglob('*') if f.is_file() and '__pycache__' not in f.parts]
source_files += [str(f.relative_to(root)) for f in (root / 'assets' / 'lingye').glob('*.png')]
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    for name in ['灵野图鉴-离线版.html', '开始探险.txt']:
        package.write(output / name, name)
    package.writestr('GitHub下载.txt', '项目：https://github.com/Meiosis7/lingye-biology-island\n成品：https://github.com/Meiosis7/lingye-biology-island/releases/latest\n')
    for file in source_files:
        package.write(root / file, '可编辑源码/' + file)
    for file, name in [('world.png', '生命群岛-像素地图.png'), ('creatures.png', '16种原创生灵-像素图集.png'), ('researcher-sheet.png', '岑叶-四方向行走图集.png')]:
        package.write(root / 'assets' / 'lingye' / file, '美术素材/' + name)
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    assert not any('Godot' in name for name in package.namelist())
print(f'Complete release archive verified: {archive.name} ({archive.stat().st_size / 1024 / 1024:.2f} MB)')
