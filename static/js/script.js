const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const info = document.getElementById("info");
const previewTable = document.getElementById("previewTable");

uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // --- 1. UPLOAD AND BUILD TABLE ---
    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error);
            return;
        }

        info.textContent = `Rows: ${data.shape[0]} | Columns: ${data.shape[1]}`;
        previewTable.innerHTML = "";

        // Build Table Header
        const header = document.createElement("tr");
        data.columns.forEach(col => {
            const th = document.createElement("th");
            th.textContent = col;
            header.appendChild(th);
        });
        previewTable.appendChild(header);

        // Build Table Rows
        data.preview.forEach(row => {
            const tr = document.createElement("tr");
            data.columns.forEach(col => {
                const td = document.createElement("td");
                td.textContent = row[col];
                tr.appendChild(td);
            });
            previewTable.appendChild(tr);
        });

    } catch (err) {
        alert("Error uploading file: " + err.message);
        return; // Stop execution if upload fails
    }

    // --- 2. FETCH ANALYSIS AND DISPLAY ISSUES ---
    try {
        console.log("Fetching /analyze...");
        
        // FIXED: Added { method: "POST" } here
        const analyzeResponse = await fetch("/analyze", {
            method: "POST" 
        });
        
        if (!analyzeResponse.ok) {
            throw new Error(`Server returned status ${analyzeResponse.status}`);
        }
        
        const issues = await analyzeResponse.json();
        console.log("Analysis received:", issues);
        
        displayIssues(issues);

    } catch (analyzeErr) {
        console.error("Analysis Error:", analyzeErr);
        // Display the error on the frontend so you know exactly what failed
        displayIssuesError(analyzeErr.message);
    }
});

// Helper function to dynamically build the UI and highlight headers
function displayIssues(issues) {
    let issuesDiv = getOrCreateIssuesDiv();

    // Reset the contents
    issuesDiv.innerHTML = '<h3>Dataset Analysis</h3>';
    
    // Basic styling dynamically 
    issuesDiv.style.marginTop = '20px';
    issuesDiv.style.padding = '15px';
    issuesDiv.style.border = '1px solid #ccc';
    issuesDiv.style.borderRadius = '5px';
    issuesDiv.style.backgroundColor = '#f9f9f9';

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
    if (issues.missing && Object.keys(issues.missing).length > 0) {
        hasIssues = true;
        const missingHeader = document.createElement('p');
        missingHeader.innerHTML = `<strong>Missing Values:</strong>`;
        issuesDiv.appendChild(missingHeader);

        const ul = document.createElement('ul');
        for (const [colName, stats] of Object.entries(issues.missing)) {
            const li = document.createElement('li');
            li.textContent = `${colName}: ${stats.count} missing (${stats.percent}%)`;
            ul.appendChild(li);

            // Highlight the corresponding table header
            const headers = document.querySelectorAll('#previewTable th');
            headers.forEach(th => {
                if (th.textContent.trim() === colName) {
                    th.style.backgroundColor = '#ffe6e6'; 
                    th.style.color = '#d8000c';
                    th.textContent = `${colName} *`; 
                }
            });
        }
        issuesDiv.appendChild(ul);
    }

    // If perfectly clean
    if (!hasIssues) {
        const perfectElem = document.createElement('p');
        perfectElem.style.color = 'green';
        perfectElem.textContent = 'No issues found. The dataset looks clean!';
        issuesDiv.appendChild(perfectElem);
    }
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
            // Find the actual <table> wrapper in case previewTable is a <tbody>
            const actualTable = table.closest('table') || table;
            // Safely insert the div right after the table
            actualTable.insertAdjacentElement('afterend', issuesDiv);
        } else {
            document.body.appendChild(issuesDiv);
        }
    }
    return issuesDiv;
}