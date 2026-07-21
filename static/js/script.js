const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const info = document.getElementById("info");
const previewTable = document.getElementById("previewTable");

function updatePreviewTable(data) {
    info.textContent = `Rows: ${data.shape[0]} | Columns: ${data.shape[1]}`;
    previewTable.innerHTML = "";

    const header = document.createElement("tr");
    data.columns.forEach((col) => {
        const th = document.createElement("th");
        th.dataset.colName = col;
        th.textContent = col;
        header.appendChild(th);
    });
    previewTable.appendChild(header);

    data.preview.forEach((row) => {
        const tr = document.createElement("tr");
        data.columns.forEach((col) => {
            const td = document.createElement("td");
            td.textContent = row[col] !== null && row[col] !== undefined ? row[col] : "";
            tr.appendChild(td);
        });
        previewTable.appendChild(tr);
    });
}

function getOrCreateIssuesDiv() {
    let issuesDiv = document.getElementById("issues");
    if (!issuesDiv) {
        issuesDiv = document.createElement("div");
        issuesDiv.id = "issues";
        previewTable.insertAdjacentElement("afterend", issuesDiv);
    }
    return issuesDiv;
}

function displayIssues(issues) {
    const issuesDiv = getOrCreateIssuesDiv();
    issuesDiv.innerHTML = "<h3>Dataset Analysis</h3>";
    issuesDiv.style.marginTop = "20px";
    issuesDiv.style.padding = "15px";
    issuesDiv.style.border = "1px solid #ccc";
    issuesDiv.style.borderRadius = "5px";
    issuesDiv.style.backgroundColor = "#f9f9f9";

    const headers = document.querySelectorAll("#previewTable th");
    headers.forEach((th) => {
        th.style.backgroundColor = "";
        th.style.color = "";
        if (th.dataset.colName) {
            th.textContent = th.dataset.colName;
        }
    });

    let hasIssues = false;

    if (issues.duplicates && issues.duplicates > 0) {
        hasIssues = true;
        const duplicateElem = document.createElement("p");
        duplicateElem.innerHTML = `<strong>Duplicate Rows:</strong> ${issues.duplicates}`;
        issuesDiv.appendChild(duplicateElem);
    }

    if (issues.skewed && issues.skewed.length > 0) {
        hasIssues = true;
        const skewedElem = document.createElement("p");
        skewedElem.innerHTML = `<strong>Skewed Columns:</strong> ${issues.skewed.join(", ")}`;
        issuesDiv.appendChild(skewedElem);
    }

    const missingCols = issues.missing ? Object.keys(issues.missing) : [];
    if (missingCols.length > 0) {
        hasIssues = true;
        const missingHeader = document.createElement("p");
        missingHeader.innerHTML = "<strong>Missing Values:</strong>";
        issuesDiv.appendChild(missingHeader);

        const ul = document.createElement("ul");
        missingCols.forEach((colName) => {
            const stats = issues.missing[colName];
            const li = document.createElement("li");
            li.textContent = `${colName}: ${stats.count} missing (${stats.percent}%)`;
            ul.appendChild(li);

            headers.forEach((th) => {
                if ((th.dataset.colName || th.textContent.trim()) === colName) {
                    th.style.backgroundColor = "#ffe6e6";
                    th.style.color = "#d8000c";
                }
            });
        });
        issuesDiv.appendChild(ul);
    }

    if (!hasIssues) {
        const perfectElem = document.createElement("p");
        perfectElem.style.color = "green";
        perfectElem.textContent = "No issues found. The dataset looks clean!";
        issuesDiv.appendChild(perfectElem);
    }

    const existingControls = document.getElementById("cleaning-controls");
    if (existingControls) {
        existingControls.remove();
    }

    const cleaningControls = document.createElement("div");
    cleaningControls.id = "cleaning-controls";
    cleaningControls.style.marginTop = "20px";
    cleaningControls.style.padding = "15px";
    cleaningControls.style.border = "1px solid #ccc";
    cleaningControls.style.borderRadius = "5px";
    cleaningControls.style.backgroundColor = "#f4f7f6";

    const heading = document.createElement("h3");
    heading.textContent = "Clean Missing Values";
    cleaningControls.appendChild(heading);

    if (missingCols.length === 0) {
        const noMissingMsg = document.createElement("p");
        noMissingMsg.style.color = "green";
        noMissingMsg.style.fontWeight = "bold";
        noMissingMsg.textContent = "No missing values left.";
        cleaningControls.appendChild(noMissingMsg);
    } else {
        missingCols.forEach((colName) => {
            const colDiv = document.createElement("div");
            colDiv.style.marginBottom = "12px";

            const label = document.createElement("label");
            label.textContent = `${colName}: `;
            label.style.fontWeight = "bold";
            label.style.marginRight = "10px";

            const select = document.createElement("select");
            select.dataset.column = colName;

            const actions = [
                { value: "keep", text: "Keep missing" },
                { value: "drop_rows", text: "Drop rows with missing" },
                { value: "fill_mean", text: "Fill with mean" },
                { value: "fill_median", text: "Fill with median" },
                { value: "fill_mode", text: "Fill with mode" },
                { value: "interpolate", text: "Interpolate" },
                { value: "drop_column", text: "Drop whole column" }
            ];

            actions.forEach((action) => {
                const option = document.createElement("option");
                option.value = action.value;
                option.textContent = action.text;
                select.appendChild(option);
            });

            colDiv.appendChild(label);
            colDiv.appendChild(select);
            cleaningControls.appendChild(colDiv);
        });

        const applyBtn = document.createElement("button");
        applyBtn.textContent = "Apply Cleaning";
        applyBtn.style.marginTop = "15px";
        applyBtn.style.padding = "8px 16px";
        applyBtn.style.cursor = "pointer";

        applyBtn.addEventListener("click", async () => {
            const operations = {};
            const dropdowns = cleaningControls.querySelectorAll("select");
            dropdowns.forEach((select) => {
                const colName = select.dataset.column;
                operations[colName] = { action: select.value };
            });

            try {
                const response = await fetch("/clean", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(operations)
                });

                const data = await response.json();
                if (!response.ok) {
                    alert(data.error || "Cleaning failed");
                    return;
                }

                updatePreviewTable(data);
                displayIssues(data.issues);
            } catch (err) {
                alert("An error occurred while cleaning data: " + err.message);
            }
        });

        cleaningControls.appendChild(applyBtn);
    }

    issuesDiv.insertAdjacentElement("afterend", cleaningControls);
}

function displayIssuesError(errorMessage) {
    const issuesDiv = getOrCreateIssuesDiv();
    issuesDiv.style.marginTop = "20px";
    issuesDiv.style.padding = "15px";
    issuesDiv.style.border = "1px solid #ffcccc";
    issuesDiv.style.backgroundColor = "#fff0f0";
    issuesDiv.innerHTML = `<h3 style="color: red; margin-top: 0;">Analysis Failed</h3>
                           <p>Could not load dataset analysis. Error: <strong>${errorMessage}</strong></p>`;
}

uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert("Please select a file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.error || "Upload failed");
            return;
        }

        updatePreviewTable(data);

        const analyzeResponse = await fetch("/analyze", { method: "POST" });
        if (!analyzeResponse.ok) {
            throw new Error(`Server returned status ${analyzeResponse.status}`);
        }

        const issues = await analyzeResponse.json();
        displayIssues(issues);
    } catch (err) {
        displayIssuesError(err.message);
        console.error(err);
    }
});
