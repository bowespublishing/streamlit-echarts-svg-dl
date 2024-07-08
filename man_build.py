import os
import subprocess
from pathlib import Path
from prompt_toolkit import prompt,HTML
from tomlkit import dumps, loads, document, comment,load,dump
import json

if __name__=="__main__":

    current = Path(__file__).parent  
    print(current.joinpath('pyproject.toml').exists())
    with open(current.joinpath('pyproject.toml'),mode='r+',encoding='utf8')  as io:
        py_toml = load(io)
        current_ver = py_toml['project']['version']
        new_ver = prompt(HTML(f'<ansigreen>current pkg version:{current_ver}，use current or input new one, format-major.minor.patch:</ansigreen>'))
        if new_ver != '':            
            py_toml['project']['version'] = new_ver
            io.seek(0)
            io.truncate()
            dump(py_toml,io)
            with open(current.joinpath('streamlit_echarts5/frontend/package.json'),mode='r+',encoding='utf8') as js:
                conf = json.load(js)
                conf['version']=new_ver
                js.seek(0)
                js.truncate()
                json.dump(conf,js,indent=2)