const vscode = require('vscode');

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

let openedDocuments = [];
let previewOpen = false;

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

	let exportToFile = vscode.commands.registerCommand('json-extractor.export-to-file', function () {
		exportFile();
	});

	let preview = vscode.commands.registerCommand('json-extractor.preview', function () {
		previewJson();
	});

	context.subscriptions.push(exportToFile);
	context.subscriptions.push(preview);
}

function previewJson() {
	if (vscode.window.activeTextEditor) {
			previewOpen = true;
			displayWebView(vscode.window.activeTextEditor.document);
	} else {
		vscode.window.showErrorMessage("Active editor doesn't show a MJML document.");
	}
}

vscode.workspace.onDidOpenTextDocument((document) => {
	if (document && previewOpen && vscode.workspace.autoPreview) {
			displayWebView(document);
	}
}),

vscode.window.onDidChangeActiveTextEditor((editor) => {
	if (editor && previewOpen && vscode.workspace.autoPreview) {
			displayWebView(editor.document);
	}
}),

vscode.workspace.onDidChangeTextDocument((event) => {
	if (event && previewOpen && vscode.workspace.updateWhenTyping) {
			displayWebView(event.document);
	}
}),

vscode.workspace.onDidSaveTextDocument((document) => {
	if (document && previewOpen) {
			displayWebView(document);
	}
}),

vscode.workspace.onDidCloseTextDocument((document) => {
	if (document && previewOpen && webview) {
			removeDocument(document.fileName);

			if (this.openedDocuments.length === 0 && vscode.workspace.autoClosePreview) {
					this.dispose();
			}
	}
})

function displayWebView(document) {

	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor || !activeTextEditor.document) {
			return;
	}

	const content = getContent(document);
	const label = `Json Preview - ${path.basename(activeTextEditor.document.fileName)}`;

	if (!this.webview) {
			this.webview = vscode.window.createWebviewPanel("mjml-preview", label, vscode.ViewColumn.Two, {
					retainContextWhenHidden: true
			});

			this.webview.webview.html = content;

			this.webview.onDidDispose(() => {
					this.webview = undefined;
					this.previewOpen = false;
			}, null, this.subscriptions);

			if (vscode.workspace.preserveFocus) {
					// Preserve focus of Text Editor after preview open
					vscode.window.showTextDocument(activeTextEditor.document, vscode.ViewColumn.One);
			}
	} else {
			this.webview.title = label;
			this.webview.webview.html = content;
	}
}

function getContent(document) {

	let content = jsonExtract(
			document.getText()
	);

	if (content) {
			addDocument(document.fileName);

			return content;
	}

	return this.error("Active editor doesn't show a document.");
}

function addDocument(fileName) {
	if (openedDocuments.indexOf(fileName) === -1) {
			openedDocuments.push(fileName);
	}
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
