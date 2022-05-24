const vscode = require('vscode');

var fs = require('fs');
var path = require('path');

Array.prototype.toFakeHash = function(separator = ".") {
	const buildBranch = (datas = [], json = {}, current = null) => {
	  if (!datas.length) return { ...json, ...current }
	  if (!current) current = json;
	
	  const key = datas.shift()
	
	  try {
		if (!current[key]) current[key] = { }
		if (!datas.length) current[key] = Math.random()
	  } catch {
		console.warn(`[SKIP] - Jeux de données identiques pour une clé`)
	  } finally {    
		return buildBranch(datas, json, current[key])
	  }
	}
  
	const buildTree = (datas = [], json = {}) => {
	  if (!datas.length) return json
  
	  let keys = []
	
	  try {
		keys = datas.shift().split(separator)
	  } catch {
		console.warn("[SKIP] - Jeux de données malformées pour une clé")
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

	console.log('JSON Extractor is now active!');

	let disposable = vscode.commands.registerCommand('json-extractor.export-to-file', function () {
		console.log('Export !');
		exportFile();
	});

	context.subscriptions.push(disposable);
}

function exportFile() {
	render((content) => {

		const defaultFileName = path.basename(getPath()).replace(/\.[^\.]+$/, '');
		const exportType = `.json`;

		vscode.window
			.showInputBox({
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

	lines.toFakeHash();
    
    return JSON.stringify(lines);
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
