# BankIQ Dashboard

This repository contains the front-end module for the BankIQ customer segmentation and insights dashboard. It is built with React, TypeScript, Vite, and a set of charting and export libraries.

The application flow is:

1. User logs in
2. Uploads a CSV/Excel file and JSON data dictionary
3. Selects relevant columns/features
4. Starts the clustering job via the backend API
5. Polls job status until the cluster output is ready
6. Downloads generated artifacts from S3
7. Generates executive insights and recommendations

---

## 1. How to run the code

### Prerequisites

- Node.js 18+
- npm 9+
- Access to the backend APIs and AWS/S3 resources used by the module

### Install dependencies

```bash
npm install
```

### Environment configuration

Create a `.env` file in the project root if you need to override default API endpoints.

```env
VITE_API_BASE=http://localhost:8000
VITE_CLUSTER_API_BASE=https://your-cluster-api-base-url
```

Notes:

- `VITE_API_BASE` is used by the local upload helper in `src/lib/api.ts`.
- `VITE_CLUSTER_API_BASE` is used to prefix the clustering API paths in `ClusterPage.tsx`.
- If this value is not set, the app falls back to the hardcoded AWS endpoints already present in the component code.

### Run locally

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173/
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## 2. App login and module flow

### Default login credentials

The app uses local authentication in `src/config/authConfig.ts`.

Available accounts:

- `admin` / `admin`
- `bankiq_analyst` / `Insight#456`
- `bankiq_ops` / `OpsSecure789`
- `bankiq_viewer` / `Viewer!321`

### Typical user journey

1. Login screen at `/`
2. Upload dataset in `/upload`
   - CSV or Excel file
   - JSON data dictionary
3. Data is uploaded to S3 using a presigned URL
4. User navigates to cluster configuration page
5. Job is submitted to the cluster backend API
6. Status polling checks backend completion
7. User reviews PCA plot, metrics, and download links
8. Final analysis page fetches cluster insights and renders recommendations

---

## 3. API details called by this module

The module calls several external endpoints. The main ones are listed below.

### 3.1 S3 presigned upload URL

Used for uploading the input dataset and configuration files to S3.

- Endpoint: `https://i9rdy53so7.execute-api.ap-south-1.amazonaws.com/getPresignedUrl`
- Method: `POST`
- Content-Type: `application/json`
- Request body:

```json
{
  "fileName": "<user>/sessions/<session>/input/<file_name>",
  "contentType": "text/csv"
}
```

Example from the app:

```json
{
  "fileName": "admin/sessions/session-123/input/data.csv",
  "contentType": "text/csv"
}
```

Expected response:

```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "s3_bucket": "bucket-name",
  "s3_key": "user/sessions/session-123/input/data.csv"
}
```

The front-end then uploads the file with:

```javascript
fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type },
  body: file,
});
```

Purpose:
- Upload raw dataset to S3 before clustering
- Upload generated config JSON to the output/config path

---

### 3.2 S3 presigned download URL

Used to fetch files from S3 for metrics, plots, and generated artifacts.

- Endpoint: `https://pxca8372m3.execute-api.ap-south-1.amazonaws.com/getDownloadUrl`
- Method: `POST`
- Content-Type: `application/json`
- Request body:

```json
{
  "s3_key": "<path/to/file>",
  "s3_bucket": "<bucket-name>"
}
```

Example:

```json
{
  "s3_key": "admin/sessions/session-123/output/metrics.json",
  "s3_bucket": "my-bucket"
}
```

Expected response:

```json
{
  "downloadUrl": "https://<signed-url>"
}
```

This is used for:

- `metrics.json` download
- PCA plot image access
- any output file retrieval from S3

---

### 3.3 Cluster job submission

This is the main ML orchestration endpoint.

- Endpoint: `${VITE_CLUSTER_API_BASE}/run-job`
- Method: `POST`
- Content-Type: `application/json`
- Default base in code: environment override or backend-specific API

Request body generated in `ClusterPage.tsx`:

```json
{
  "user_id": "admin",
  "session_id": "session-123",
  "input_data_path": "s3://bucket/path/to/input/",
  "file_name": "input_data.csv",
  "config_s3_uri": "s3://bucket/path/to/config/sample_config.json",
  "id_col": "Customer_ID"
}
```

The app builds the config payload before submission:

```json
{
  "mode": "train",
  "model": "KMeans",
  "features": ["feature_1", "feature_2", "feature_3"],
  "parameters": {
    "auto_k": true,
    "max_iter": 300
  }
}
```

Expected success response:

```json
{
  "job_name": "cluster-job-abc123",
  "status": "submitted"
}
```

These values are then stored in local storage:

- `lastClusterJobName`
- `clusterConfig`

---

### 3.4 Cluster job status polling

After submission, the app polls every 20 seconds.

- Endpoint: `${VITE_CLUSTER_API_BASE}/status/<job_name>`
- Method: `GET`

Example:

```text
https://your-cluster-api-base/status/cluster-job-abc123
```

Typical response:

```json
{
  "status": "Completed",
  "output_url": "s3://bucket/path/output/",
  "pca_plot_s3_path": "s3://bucket/path/output/pca_plot.png",
  "metrics_s3_path": "s3://bucket/path/output/metrics.json",
  "presigned_urls": {
    "pca_plot.png": "https://...",
    "metrics.json": "https://..."
  }
}
```

The UI transitions through:

- `pending`
- `in_progress`
- `Completed`
- `Failed`

---

### 3.5 Insights generation API

This API generates cluster-level insight summaries and recommendations.

- Endpoint: `https://11pa6tjf3g.execute-api.ap-south-1.amazonaws.com/dev/insights`
- Method: `POST`
- Content-Type: `application/json`

Request body built in `AnalysisPageFinal.tsx`:

```json
{
  "s3_bucket": "bucket-name",
  "s3_key": "session/output/clustered_output.csv",
  "cluster_column": "Cluster",
  "selected_features": ["feature_1", "feature_2", "feature_3"],
  "column_descriptions": {
    "feature_1": "Description from data dictionary",
    "feature_2": "Description from data dictionary"
  }
}
```

Expected response:

```json
{
  "insight": {
    "clusters": {
      "0": {
        "title": "High Value Customers",
        "insights": ["..."],
        "recommendations": [
          {
            "product": "Credit Upgrade",
            "reason": "..."
          }
        ]
      }
    }
  }
}
```

This data is rendered on the analysis page as cluster summaries and recommendations.

---

### 3.6 Local helper endpoint in `src/lib/api.ts`

This API helper is present but not the main flow in the UI.

- Endpoint: `${VITE_API_BASE}/upload`
- Method: `POST`
- Content-Type: `multipart/form-data`

```javascript
const form = new FormData();
form.append("file", file);
```

Purpose:
- generic file upload helper
- currently not the primary path used by the dashboard screens

---

## 4. Data and state handling

### Uploaded data

The app stores the dataset in browser local storage:

- `uploadedData`: full parsed table
- `selectedColumns`: selected feature columns
- `uploadedFileName`: input file name
- `customerIdColumn`: identifier column for customer records
- `dataDictionary`: uploaded JSON dictionary
- `s3_key` and `s3_path`: S3 locations for the uploaded source file
- `insightMode`: `static` or `dynamic`
- `lastClusterJobName`: latest cluster job name

### Data dictionary structure

The uploaded dictionary typically contains two sections:

```json
{
  "static": {
    "Age": "Customer age in years",
    "Income": "Annual income"
  },
  "dynamic": {
    "Monthly_Spend": "Average monthly spend",
    "Loan_Utilization": "Current loan utilization ratio"
  }
}
```

This dictionary is used for:

- feature selection help
- column descriptions in the insight engine request
- static/dynamic analysis mode decisions

---

## 5. Module architecture (KT summary)

### Front-end pages

- `src/pages/Login.tsx` — authentication
- `src/pages/UploadPage2.tsx` — CSV/Excel upload and S3 presign workflow
- `src/pages/ClusterPage.tsx` — clustering configuration, job submission, polling, artifact loading
- `src/pages/AnalysisPageFinal.tsx` — cluster distribution charts, metrics, and insight generation
- `src/App.tsx` — route definitions

### Key UI components

- `src/components/Header.tsx` — global application header
- `src/components/LeftPanel2.tsx` — analysis panel for column selection / view controls
- `src/components/DynamicChart1.tsx` — chart rendering for analysis dashboards
- `src/components/HeatMap.tsx` — heatmap visualisation
- `src/components/PrimaryButton.tsx` — reusable buttons

### Important logic areas

- Login session management is in `src/config/session.ts`
- Auth rules are in `src/config/authConfig.ts`
- API helpers and env configuration are in `src/lib/api.ts`
- Dashboard flow uses localStorage for application state and cross-page transfer

---

## 6. Runtime assumptions and dependencies

This module expects the following backend contracts to exist:

- AWS Lambda/API Gateway endpoints for presigned S3 upload and download URLs
- A cluster orchestration API with `/run-job` and `/status/{job_name}`
- An insight generation API that accepts clustered output and returns per-cluster summaries
- S3 bucket folders for input, config, and output artifacts

The app is tightly coupled to S3-based intermediate artifacts, so ensure the input file path and output directory conventions match the backend expectations.

---

## 7. Troubleshooting

### Issue: app cannot upload the file

Check:

- whether the presign endpoint is reachable
- whether `fileName` and `contentType` match the backend contract
- whether the file is being uploaded to the generated `uploadUrl` with the correct `PUT` request

### Issue: clustering job never completes

Check:

- `VITE_CLUSTER_API_BASE` value
- backend job status endpoint
- whether `input_data_path`, `config_s3_uri`, and `id_col` are valid
- whether the uploaded config file exists in S3 and is readable

### Issue: analysis page shows no insights

Check:

- whether the clustered CSV was produced and stored in the expected S3 location
- whether `Cluster` column exists in the data
- whether the selected features and column descriptions match backend expectations

### Issue: build fails

Run:

```bash
npm install
npm run build
```

If a dependency or TypeScript configuration issue appears, verify Node version and reinstall packages.

---

## 8. KT notes

This is a front-end dashboard module that orchestrates a backend data-science pipeline rather than performing clustering directly on the client. The most important contract points to remember are:

- The front-end uploads raw files and configuration to S3.
- The backend job API runs the actual model and reports job status back.
- The output artifacts are fetched from S3 presigned URLs.
- Final insight generation depends on the `Cluster` column and selected feature metadata.

For handover, the people supporting this module should understand:

- API endpoints and expected payloads
- S3 folder and file naming conventions
- localStorage state keys used for page-to-page continuity
- cluster job lifecycle from submission to status polling and output retrieval

---

## 9. Quick reference

### Useful commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

### Core URLs used by the app

```text
https://i9rdy53so7.execute-api.ap-south-1.amazonaws.com/getPresignedUrl
https://pxca8372m3.execute-api.ap-south-1.amazonaws.com/getDownloadUrl
https://11pa6tjf3g.execute-api.ap-south-1.amazonaws.com/dev/insights
```

### Important localStorage keys

```text
uploadedData
selectedColumns
uploadedFileName
customerIdColumn
dataDictionary
s3_key
s3_path
insightMode
lastClusterJobName
```

---

## 10. Summary

This module is a complete front-end workflow for customer segmentation analytics. It handles authentication, file ingestion, S3-based artifact flow, model execution orchestration, and business insight presentation. The most critical knowledge for KT is the S3 and backend API contract, the job lifecycle, and the state keys that connect the pages of the application.
