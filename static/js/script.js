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

        const header = document.createElement("tr");

        data.columns.forEach(col => {
            const th = document.createElement("th");
            th.textContent = col;
            header.appendChild(th);
        });

        previewTable.appendChild(header);

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
        alert(err.message);
    }

});