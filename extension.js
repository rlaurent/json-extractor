const vscode = require('vscode');

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

Array.prototype.toFakeHash = function(separator = ".") {
	const buildBranch = (datas = [], json = {}, current = null) => {
	  if (!datas.length){
			return { ...json, current }
		}
	  if (!current){
			current = json;
		}
		
	  const key = datas.shift();
		
	  try {
			if (!current[key]){
				current[key] = { };
			} 
			if (!datas.length) {
				current[key] =  faker.random.word();
			}
		} catch(e) {
			console.warn(`[SKIP] - Same data sets for a key`);
		} finally {    
				return buildBranch(datas, json, current[key])
		}
	}
  
	const buildTree = (datas = [], json = {}) => {
	  if (!datas.length) {
			return json;
		}
		
	  let keys = [];
		
	  try {
			keys = datas.shift().split(separator);
		} catch(e) {
			console.warn(`[SKIP] - Wrong data sets for a key`);
		} finally {    
			return buildTree(datas, buildBranch(keys, json))
	  }
	}
  
	return buildTree(this)
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let disposable = vscode.commands.registerCommand('json-extractor.export-to-file', function () {
		exportFile();
	});

	context.subscriptions.push(disposable);
}

function exportFile() {
	render((content) => {
		const defaultFileName = path.basename(getPath()).replace(/\.[^\.]+$/, '');
		const exportType = `.json`;

		vscode.window.showInputBox({
			placeHolder: `Enter a filename (${defaultFileName}${exportType} or .xyz).`,
			prompt: 'Filename',
			value: defaultFileName + exportType,
		})
		.then((fileName) => {
			if (!fileName) {
				return;
			}

			if (!/[.]/.exec(fileName)) {
				fileName += exportType;
			}

			if (fileName.startsWith('.')) {
				fileName = defaultFileName + fileName;
			}

			fs.writeFile(path.resolve(getPath(), `../${fileName}`), content, (error) => {
				if (error) {
					vscode.window.showErrorMessage(`Could not save the file: ${error.message}`);
				} else {
					vscode.window.showInformationMessage(`File saved as ${path.basename(path.resolve(getPath(), `../${fileName}`))}`);
				}
			});
		});
	});
};

function render(cb){ 
    const activeTextEditor = vscode.window.activeTextEditor;

    if (!activeTextEditor) {
        return;
    }

    let content = jsonExtract(
        activeTextEditor.document.getText()
    );

    if (content) {
        return cb(content);
    } else {
        vscode.window.showErrorMessage(`Failed to parse file ${path.basename(getPath())}`);
    }

}

function jsonExtract(text){
    var re = /{{ ([\s\S]*?) }}/g; 
    var m;
    var lines = [];

    while ((m = re.exec(text)) !== null) {
        var key;
        
        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }

        key = m[1];
        lines.push(key);
    }
    
    return JSON.stringify(lines.toFakeHash());
}

function getPath() {
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document) {
        return vscode.window.activeTextEditor.document.uri.fsPath;
    }

    return '';
}

function deactivate(context) {
    for (const subscription of context.subscriptions) {
        subscription.dispose();
    }
}

module.exports = {
	activate,
	deactivate
}
