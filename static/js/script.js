// script.js

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const info = document.getElementById("info");
const previewTable = document.getElementById("previewTable");

// --- REUSABLE HELPER: Builds or Refreshes the Table Preview ---
function updatePreviewTable(data) {
    info.textContent = `Rows: ${data.shape[0]} | Columns: ${data.shape[1]}`;
    previewTable.innerHTML = "";

    // Build Table Header
    const header = document.createElement("tr");
    data.columns.forEach(col => {
        const th = document.createElement("th");
        th.dataset.colName = col; // Store clean original column name
        th.textContent = col;     // Keep pure header text
        header.appendChild(th);
    });
    previewTable.appendChild(header);

    // Build Table Rows
    data.preview.forEach(row => {
        const tr = document.createElement("tr");
        data.columns.forEach(col => {
            const td = document.createElement("td");
            // Render empty string if value is null/undefined
            td.textContent = row[col] !== null && row[col] !== undefined ? row[col] : "";
            tr.appendChild(td);
        });
        previewTable.appendChild(tr);
    });
}

// --- FILE UPLOAD EVENT LISTENER ---
uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    let uploadData;

    // --- 1. UPLOAD AND BUILD TABLE ---
    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        uploadData = await response.json();

        if (!response.ok) {
            alert(uploadData.error);
            return;
        }

        updatePreviewTable(uploadData);

    } catch (err) {
        alert("Error uploading file: " + err.message);
        return; 
    }

    // --- 2. FETCH ANALYSIS AND DISPLAY UI COMPONENTS ---
    try {
        console.log("Fetching /analyze...");
        
        const analyzeResponse = await fetch("/analyze", {
            method: "POST" 
        });
        
        if (!analyzeResponse.ok) {
            throw new Error(`Server returned status ${analyzeResponse.status}`);
        }
        
        const issues = await analyzeResponse.json();
        console.log("Analysis received:", issues);
        
        displayIssues(issues);

        // COMMIT 2: Display Model Configuration UI using the columns from the upload
        displayModelConfig(uploadData.columns);

    } catch (analyzeErr) {
        console.error("Analysis Error:", analyzeErr);
        displayIssuesError(analyzeErr.message);
    }
});

// --- MAIN UI GENERATION & INTERACTION LOOP ---
function displayIssues(issues) {
    let issuesDiv = getOrCreateIssuesDiv();

    // Reset contents
    issuesDiv.innerHTML = '<h3>Dataset Analysis</h3>';
    
    // Basic structural styling
    issuesDiv.style.marginTop = '20px';
    issuesDiv.style.padding = '15px';
    issuesDiv.style.border = '1px solid #ccc';
    issuesDiv.style.borderRadius = '5px';
    issuesDiv.style.backgroundColor = '#f9f9f9';

    // Reset table headers to original state before highlighting missing columns
    const headers = document.querySelectorAll('#previewTable th');
    headers.forEach(th => {
        th.style.backgroundColor = '';
        th.style.color = '';
        if (th.dataset.colName) {
            th.textContent = th.dataset.colName; 
        }
    });

    let hasIssues = false;

    // Handle Duplicates
    if (issues.duplicates && issues.duplicates > 0) {
        hasIssues = true;
        const duplicateElem = document.createElement('p');
        duplicateElem.innerHTML = `<strong>Duplicate Rows:</strong> ${issues.duplicates}`;
        issuesDiv.appendChild(duplicateElem);
    }

    // Handle Skewed Columns
    if (issues.skewed && issues.skewed.length > 0) {
        hasIssues = true;
        const skewedElem = document.createElement('p');
        skewedElem.innerHTML = `<strong>Skewed Columns:</strong> ${issues.skewed.join(', ')}`;
        issuesDiv.appendChild(skewedElem);
    }

    // Handle Missing Values & Header Highlighting
    const missingCols = issues.missing ? Object.keys(issues.missing) : [];
    
    if (missingCols.length > 0) {
        hasIssues = true;
        const missingHeader = document.createElement('p');
        missingHeader.innerHTML = `<strong>Missing Values:</strong>`;
        issuesDiv.appendChild(missingHeader);

        const ul = document.createElement('ul');
        for (const [colName, stats] of Object.entries(issues.missing)) {
            const li = document.createElement('li');
            li.textContent = `${colName}: ${stats.count} missing (${stats.percent}%)`;
            ul.appendChild(li);

            headers.forEach(th => {
                const pureColName = th.dataset.colName || th.textContent.trim();
                if (pureColName === colName) {
                    th.style.backgroundColor = '#ffe6e6'; 
                    th.style.color = '#d8000c';
                }
            });
        }
        issuesDiv.appendChild(ul);
    }

    if (!hasIssues) {
        const perfectElem = document.createElement('p');
        perfectElem.style.color = 'green';
        perfectElem.textContent = 'No issues found. The dataset looks clean!';
        issuesDiv.appendChild(perfectElem);
    }
    
    // Always remove existing cleaning controls first
    const existingControls = document.getElementById('cleaning-controls');
    if (existingControls) {
        existingControls.remove();
    }

    const cleaningControls = document.createElement('div');
    cleaningControls.id = 'cleaning-controls';
    cleaningControls.style.marginTop = '20px';
    cleaningControls.style.padding = '15px';
    cleaningControls.style.border = '1px solid #ccc';
    cleaningControls.style.borderRadius = '5px';
    cleaningControls.style.backgroundColor = '#f4f7f6';

    const heading = document.createElement('h3');
    heading.textContent = 'Clean Missing Values';
    cleaningControls.appendChild(heading);

    if (missingCols.length === 0) {
        const noMissingMsg = document.createElement('p');
        noMissingMsg.style.color = 'green';
        noMissingMsg.style.fontWeight = 'bold';
        noMissingMsg.textContent = 'No missing values left.';
        cleaningControls.appendChild(noMissingMsg);
    } else {
        missingCols.forEach(colName => {
            const colDiv = document.createElement('div');
            colDiv.className = 'cleaning-col-group';
            colDiv.style.marginBottom = '12px';

            const label = document.createElement('label');
            label.textContent = `${colName}: `;
            label.style.fontWeight = 'bold';
            label.style.marginRight = '10px';

            const select = document.createElement('select');
            select.name = `clean_${colName}`;
            select.dataset.column = colName; 

            const actions = [
                { value: 'keep', text: 'Keep missing' },
                { value: 'drop_rows', text: 'Drop rows with missing' },
                { value: 'fill_mean', text: 'Fill with mean' },
                { value: 'fill_median', text: 'Fill with median' },
                { value: 'fill_mode', text: 'Fill with mode' },
                { value: 'interpolate', text: 'Interpolate' },
                { value: 'drop_column', text: 'Drop whole column' }
            ];

            actions.forEach(action => {
                const option = document.createElement('option');
                option.value = action.value;
                option.textContent = action.text;
                select.appendChild(option);
            });

            colDiv.appendChild(label);
            colDiv.appendChild(select);
            cleaningControls.appendChild(colDiv);
        });

        const applyBtn = document.createElement('button');
        applyBtn.id = 'applyCleaningBtn';
        applyBtn.textContent = 'Apply Cleaning';
        applyBtn.style.marginTop = '15px';
        applyBtn.style.padding = '8px 16px';
        applyBtn.style.cursor = 'pointer';

        applyBtn.addEventListener('click', async () => {
            const operations = {};
            const dropdowns = cleaningControls.querySelectorAll('select');
            
            dropdowns.forEach(select => {
                const colName = select.dataset.column;
                operations[colName] = { action: select.value };
            });

            applyBtn.disabled = true;
            const originalBtnText = applyBtn.textContent;
            applyBtn.textContent = 'Cleaning in progress...';

            let statusMsg = document.getElementById('cleaningStatusMsg');
            if (!statusMsg) {
                statusMsg = document.createElement('span');
                statusMsg.id = 'cleaningStatusMsg';
                statusMsg.style.marginLeft = '12px';
                statusMsg.style.color = '#555';
                statusMsg.style.fontStyle = 'italic';
                applyBtn.insertAdjacentElement('afterend', statusMsg);
            }
            statusMsg.textContent = 'Processing dataset on server...';

            try {
                const response = await fetch('/clean', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(operations)
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || 'Something went wrong during cleaning.');
                    return;
                }

                if (data.shape && data.shape[0] === 0) {
                    alert('⚠️ Warning: This cleaning operation removed all rows (0 rows remaining)!');
                }

                // Refresh UI components
                updatePreviewTable(data);
                displayIssues(data.issues);
                
                // COMMIT 2: Re-build Model Config using the new columns list
                displayModelConfig(data.columns);

            } catch (err) {
                alert('An error occurred while cleaning data: ' + err.message);
            } finally {
                if (document.body.contains(applyBtn)) {
                    applyBtn.disabled = false;
                    applyBtn.textContent = originalBtnText;
                }
                if (statusMsg && document.body.contains(statusMsg)) {
                    statusMsg.remove();
                }
            }
        });

        cleaningControls.appendChild(applyBtn);
    }

    issuesDiv.insertAdjacentElement('afterend', cleaningControls);
}

// --- COMMIT 2: DYNAMIC MODEL CONFIGURATION UI ---
function displayModelConfig(columns) {
    // 1. Remove existing config section if present to avoid stacking duplicates
    const existingConfig = document.getElementById('model-config');
    if (existingConfig) {
        existingConfig.remove();
    }

    // 2. Identify the insertion point (after cleaning controls or directly after issues)
    const cleaningControls = document.getElementById('cleaning-controls');
    const issuesDiv = document.getElementById('issues');
    const anchor = cleaningControls || issuesDiv;

    if (!anchor) return;

    // 3. Create the configuration wrapper
    const configDiv = document.createElement('div');
    configDiv.id = 'model-config';
    configDiv.style.marginTop = '20px';
    configDiv.style.padding = '15px';
    configDiv.style.border = '1px solid #0056b3'; // Blue border for distinction
    configDiv.style.borderRadius = '5px';
    configDiv.style.backgroundColor = '#eef5f9';

    const heading = document.createElement('h3');
    heading.textContent = 'Model Configuration';
    heading.style.marginTop = '0';
    configDiv.appendChild(heading);

    // 4. Target Column Selection (Dropdown)
    const targetGroup = document.createElement('div');
    targetGroup.style.marginBottom = '15px';

    const targetLabel = document.createElement('label');
    targetLabel.textContent = 'Select Target Column: ';
    targetLabel.style.fontWeight = 'bold';
    targetLabel.style.marginRight = '10px';

    const targetSelect = document.createElement('select');
    targetSelect.id = 'targetSelect';
    targetSelect.innerHTML = '<option value="" disabled selected>-- Choose Target --</option>';
    
    columns.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        targetSelect.appendChild(option);
    });

    targetGroup.appendChild(targetLabel);
    targetGroup.appendChild(targetSelect);
    configDiv.appendChild(targetGroup);

    // 5. Machine Learning Task Selection (Radio Buttons)
    const taskGroup = document.createElement('div');
    taskGroup.style.marginBottom = '15px';

    const taskLabel = document.createElement('label');
    taskLabel.textContent = 'Select Task: ';
    taskLabel.style.fontWeight = 'bold';
    taskLabel.style.marginRight = '10px';
    taskGroup.appendChild(taskLabel);

    const taskTypes = [
        { id: 'taskClassification', value: 'classification', label: 'Classification' },
        { id: 'taskRegression', value: 'regression', label: 'Regression' }
    ];

    taskTypes.forEach(task => {
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'taskType';
        radio.id = task.id;
        radio.value = task.value;
        radio.style.marginRight = '5px';

        const rLabel = document.createElement('label');
        rLabel.htmlFor = task.id;
        rLabel.textContent = task.label;
        rLabel.style.marginRight = '20px';

        taskGroup.appendChild(radio);
        taskGroup.appendChild(rLabel);
    });

    configDiv.appendChild(taskGroup);

    // 6. Proceed Button
    const proceedBtn = document.createElement('button');
    proceedBtn.id = 'proceedBtn';
    proceedBtn.textContent = 'Set Target & Proceed';
    proceedBtn.disabled = true; // Disabled until both selections are made
    proceedBtn.style.padding = '8px 16px';
    proceedBtn.style.cursor = 'not-allowed';
    configDiv.appendChild(proceedBtn);

    // 7. Status Message Container
    const statusMsg = document.createElement('p');
    statusMsg.id = 'modelConfigStatus';
    statusMsg.style.marginTop = '10px';
    statusMsg.style.fontWeight = 'bold';
    configDiv.appendChild(statusMsg);

    // 8. Validation Logic: Enable proceed button only if both target and task are selected
    const validateSelection = () => {
        const selectedTarget = targetSelect.value;
        const selectedTask = document.querySelector('input[name="taskType"]:checked');
        
        if (selectedTarget && selectedTask) {
            proceedBtn.disabled = false;
            proceedBtn.style.cursor = 'pointer';
        } else {
            proceedBtn.disabled = true;
            proceedBtn.style.cursor = 'not-allowed';
        }
    };

    targetSelect.addEventListener('change', validateSelection);
    configDiv.querySelectorAll('input[name="taskType"]').forEach(radio => {
        radio.addEventListener('change', validateSelection);
    });

    // 9. Process Submission
    proceedBtn.addEventListener('click', async () => {
        const target = targetSelect.value;
        const task = document.querySelector('input[name="taskType"]:checked').value;

        // Reset state
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Saving...';
        statusMsg.textContent = '';

        try {
            const response = await fetch('/set_target', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, task })
            });

            const result = await response.json();

            if (!response.ok) {
                statusMsg.style.color = 'red';
                statusMsg.textContent = `Error: ${result.error}`;
                return;
            }

            // Success state - render dtype and warnings from backend checks
            statusMsg.style.color = 'green';
            let msg = `Success! Target set to '${result.target}' (${result.dtype}) for ${result.task}.`;
            
            if (result.warning) {
                msg += `\n⚠️ Warning: ${result.warning}`;
                statusMsg.style.color = '#d87b00'; // Dark orange for warning
            }
            
            statusMsg.innerText = msg; // InnerText renders the line breaks

        } catch (err) {
            statusMsg.style.color = 'red';
            statusMsg.textContent = `Network Error: ${err.message}`;
        } finally {
            proceedBtn.disabled = false;
            proceedBtn.textContent = 'Set Target & Proceed';
        }
    });

    // 10. Mount to DOM
    anchor.insertAdjacentElement('afterend', configDiv);
}

// Fallback function to show errors if /analyze fails
function displayIssuesError(errorMessage) {
    let issuesDiv = getOrCreateIssuesDiv();
    issuesDiv.style.marginTop = '20px';
    issuesDiv.style.padding = '15px';
    issuesDiv.style.border = '1px solid #ffcccc';
    issuesDiv.style.backgroundColor = '#fff0f0';
    issuesDiv.innerHTML = `<h3 style="color: red; margin-top: 0;">Analysis Failed</h3>
                           <p>Could not load dataset analysis. Error: <strong>${errorMessage}</strong></p>
                           <p><em>Check your browser console (F12) and backend terminal for details.</em></p>`;
}

// Helper to safely fetch or inject the issues div
function getOrCreateIssuesDiv() {
    let issuesDiv = document.getElementById('issues');
    if (!issuesDiv) {
        issuesDiv = document.createElement('div');
        issuesDiv.id = 'issues';
        
        const table = document.getElementById('previewTable');
        if (table) {
            const actualTable = table.closest('table') || table;
            actualTable.insertAdjacentElement('afterend', issuesDiv);
        } else {
            document.body.appendChild(issuesDiv);
        }
    }
    return issuesDiv;
}