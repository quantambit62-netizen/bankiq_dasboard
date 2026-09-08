import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import hyperparameters from "../../hyperparameters.json";
import metricDefinition from "../../metric.json";
import Header from "../components/Header";
import SectionHeader from "../components/SectionHeader";
import PrimaryButton from "../components/PrimaryButton";
import { getSessionUser, getSessionId } from "../config/session";

const cardBase = "bg-[#0b1c2e]/60 border border-white/10 rounded-xl p-6";
const DOWNLOAD_URL_API =
  "https://pxca8372m3.execute-api.ap-south-1.amazonaws.com/getDownloadUrl";
const UPLOAD_URL_API =
  "https://i9rdy53so7.execute-api.ap-south-1.amazonaws.com/getPresignedUrl";
const CLUSTER_API_BASE = (import.meta.env.VITE_CLUSTER_API_BASE || "").replace(/\/$/, "");

const getClusterApiUrl = (path: string) => {
  if (!CLUSTER_API_BASE) return path;
  return `${CLUSTER_API_BASE}${path}`;
};
const LOADER_COPY = {
  preparing: [
    "Preparing your clustering request and packaging model settings.",
    "Uploading configuration so the backend can reproduce this run exactly.",
    "Validating dataset path, selected model, and session context.",
  ],
  running: [
    "Running the clustering job in the backend compute environment.",
    "Evaluating feature space and generating customer segments.",
    "Monitoring job status while artifacts are being produced.",
  ],
  finalizing: [
    "Collecting the generated PCA plot and metrics from S3 output.",
    "Signing secure URLs for the final visualization artifacts.",
    "Finalizing the cluster workspace for review.",
  ],
  completed: ["Clustering completed successfully."],
} as const;

const FULLY_AUTO_CONFIG = {
  model: "KMeans" as const,
  auto_k: true,
  max_iter: 300,
} as const;

type ClusterMode = "automatic" | "custom" | null;

type UploadSummary = {
  rowCount: number;
  columnCount: number;
  selectedColumns: string[];
  insightMode: string | null;
};

type MetricGuide = {
  metric: string;
  label: string;
  description: string;
  range?: {
    min: number;
    max: number;
  };
  business_mapping?: string;
  interpretation: Array<{
    range: number[];
    quality: string;
    color?: string;
    meaning: string;
    recommendation: string;
  }>;
};

const METRIC_COLOR_CLASS: Record<string, string> = {
  green: "text-emerald-300",
  light_green: "text-lime-300",
  yellow: "text-amber-300",
  orange: "text-orange-300",
  red: "text-rose-300",
};

export default function ClusterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [summary, setSummary] = useState<UploadSummary>({
    rowCount: 0,
    columnCount: 0,
    selectedColumns: [],
    insightMode: null,
  });
  const [clusterMode, setClusterMode] = useState<ClusterMode>(null);
  const customMethod = "KMeans";
  const [customParams, setCustomParams] = useState<Record<string, any>>({});
  const [customFeatureSet, setCustomFeatureSet] = useState<string[]>([]);
  const [dynamicFeatures, setDynamicFeatures] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRunComplete, setAutoRunComplete] = useState(false);
  const [, setAutoRunLog] = useState<string[]>([]);
  const [lastSubmittedJobName, setLastSubmittedJobName] = useState<string>(
    localStorage.getItem("lastClusterJobName") || ""
  );
  const [jobStatus, setJobStatus] = useState<"pending" | "in_progress" | "Completed" | "Failed" | null>(null);
  const [outputImageUrl, setOutputImageUrl] = useState<string>("");
  const [plotImageLoaded, setPlotImageLoaded] = useState(false);
  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0);
  const [displayLoaderProgress, setDisplayLoaderProgress] = useState(0);
  const [runConfigSummary, setRunConfigSummary] = useState("");
  const [metricsData, setMetricsData] = useState<Record<string, unknown> | null>(null);
  const [metricsError, setMetricsError] = useState<string>("");
  const [downloadLinks, setDownloadLinks] = useState<Record<string, string>>({});
  const [statusPollId, setStatusPollId] = useState<number | null>(null);
  const [isClusterMaximized, setIsClusterMaximized] = useState(false);
  const [showInsightModeModal, setShowInsightModeModal] = useState(false);
  const [insightModeChoice, setInsightModeChoice] = useState<"static" | "dynamic" | null>(null);
  const [insightModeColumns, setInsightModeColumns] = useState<string[]>([]);
  const [insightSelectedColumns, setInsightSelectedColumns] = useState<string[]>([]);
  const [insightSelectionError, setInsightSelectionError] = useState("");

  useEffect(() => {
    const uploadedData = JSON.parse(
      localStorage.getItem("uploadedData") || "[]"
    ) as Record<string, unknown>[];
    const selectedColumns = JSON.parse(
      localStorage.getItem("selectedColumns") || "[]"
    ) as string[];

    setSummary({
      rowCount: uploadedData.length,
      columnCount: uploadedData[0] ? Object.keys(uploadedData[0]).length : 0,
      selectedColumns,
      insightMode:
        (location.state?.mode as string | undefined) ||
        localStorage.getItem("insightMode"),
    });

    const rawDict = JSON.parse(localStorage.getItem("dataDictionary") || "{}");
    const dynamicDict = rawDict?.dynamic || {};
    const dynamicKeys = Array.isArray(dynamicDict)
      ? dynamicDict
      : Object.keys(dynamicDict);
    setDynamicFeatures(dynamicKeys);
  }, [location.state]);

  const canRunModel = summary.rowCount > 0 && summary.selectedColumns.length > 0;
  const hasCustomFeatures = customFeatureSet.length >= 2;
  const allFeaturesSelected =
    dynamicFeatures.length > 0 &&
    customFeatureSet.length === dynamicFeatures.length;
  const isCustomReady =
    clusterMode !== "custom" ||
    (customMethod && hasCustomFeatures);
  const canRunClustering =
    canRunModel && Boolean(clusterMode) && isCustomReady;

  const loaderPhase = useMemo(() => {
    if (jobStatus === "Completed" && plotImageLoaded) return "completed";
    if (jobStatus === "Completed") return "finalizing";
    if (jobStatus === "in_progress") return "running";
    return "preparing";
  }, [jobStatus, plotImageLoaded]);

  const activeLoaderMessages = LOADER_COPY[loaderPhase];

  const showClusterLoader =
    Boolean(clusterMode) &&
    (isRunning || jobStatus === "in_progress" || (jobStatus === "Completed" && !plotImageLoaded));

  const loaderProgress = useMemo(() => {
    if (loaderPhase === "completed") return 100;
    if (loaderPhase === "preparing") return 18 + loaderMessageIndex * 8;
    if (loaderPhase === "running") return 52 + loaderMessageIndex * 7;
    return 86 + loaderMessageIndex * 4;
  }, [loaderPhase, loaderMessageIndex]);

  useEffect(() => {
    if (!showClusterLoader) {
      setDisplayLoaderProgress(0);
      return;
    }

    setDisplayLoaderProgress((prev) => Math.max(prev, Math.min(loaderProgress, 99)));
  }, [loaderProgress, showClusterLoader]);

  const metricGuide = metricDefinition as MetricGuide;

  const getNumericMetricValueByKey = (source: unknown, targetKey: string): number | null => {
    if (!source || typeof source !== "object") return null;

    const stack: Record<string, unknown>[] = [source as Record<string, unknown>];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const value = current[targetKey];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }

      Object.values(current).forEach((nested) => {
        if (nested && typeof nested === "object") {
          stack.push(nested as Record<string, unknown>);
        }
      });
    }

    return null;
  };

  const metricScoreValue = useMemo(() => {
    if (!metricsData) return null;

    const metricKeyCandidates = [
      metricGuide.metric,
      `${metricGuide.metric}_score`,
      metricGuide.metric.replace(/_score$/i, ""),
      "score",
      "metric_score",
      "value",
    ];

    for (const key of metricKeyCandidates) {
      const found = getNumericMetricValueByKey(metricsData, key);
      if (found !== null) {
        return found;
      }
    }

    return null;
  }, [metricsData, metricGuide.metric]);

  const metricInterpretation = useMemo(() => {
    if (metricScoreValue === null) return null;

    return (
      metricGuide.interpretation.find((item) => {
        const min = Math.min(item.range[0], item.range[1]);
        const max = Math.max(item.range[0], item.range[1]);
        return metricScoreValue >= min && metricScoreValue <= max;
      }) || null
    );
  }, [metricScoreValue, metricGuide.interpretation]);

  const metricScoreColorClass =
    METRIC_COLOR_CLASS[metricInterpretation?.color || ""] || "text-violet-100";

  const selectedModel: any = useMemo(
    () => (hyperparameters as any).models.find((m: any) => m.name === customMethod) as any,
    [customMethod]
  );

  useEffect(() => {
    if (selectedModel) {
      const defaults: Record<string, any> = {};
      selectedModel.parameters.forEach((param: any) => {
        defaults[param.name] = param.default;
      });
      setCustomParams(defaults);
    }
  }, [selectedModel]);

  const effectiveParameters = useMemo(() => {
    if (!selectedModel) return [];
    return selectedModel.parameters.filter((param: any) => {
      if (param.name === "n_clusters" && customParams.auto_k) {
        return false;
      }
      if (param.name === "max_iter") {
        return false;
      }
      return true;
    });
  }, [selectedModel, customParams.auto_k]);

  const clusterLabel = useMemo(() => {
    if (clusterMode === "automatic") return "Fully Automatic";
    if (clusterMode === "custom") return "Customized";
    return "Not selected";
  }, [clusterMode]);

  const getS3InputPath = (): string => {
    const rawPath = localStorage.getItem("s3_path") || localStorage.getItem("s3_key") || "";
    if (!rawPath) return "";
    const normalized = rawPath.replace(/\\/g, "/");
    return normalized.endsWith("/") ? normalized : `${normalized.substring(0, normalized.lastIndexOf("/") + 1)}`;
  };

  const getOutputImageS3Path = (): string => {
    const inputPath = getS3InputPath();
    if (!inputPath) return "";

    if (inputPath.endsWith("/input/") || inputPath.endsWith("/input")) {
      return inputPath.replace(/\/input\/?$/, "/output/") + "pca_plot.png";
    }
    return `${inputPath}pca_plot.png`;
  };

  const getMetricsS3Path = (): string => {
    const inputPath = getS3InputPath();
    if (!inputPath) return "";

    if (inputPath.endsWith("/input/") || inputPath.endsWith("/input")) {
      return inputPath.replace(/\/input\/?$/, "/output/") + "metrics.json";
    }
    return `${inputPath}metrics.json`;
  };

  const parseS3Url = (s3Url: string): { bucket: string; key: string } | null => {
    const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return {
      bucket: match[1],
      key: match[2],
    };
  };

  const getPresignedDownloadUrl = async (s3Url: string): Promise<string | null> => {
    const parsed = parseS3Url(s3Url);
    if (!parsed) {
      throw new Error(`Invalid S3 URL for presigning: ${s3Url}`);
    }

    const payload = {
      s3_key: parsed.key,
      s3_bucket: parsed.bucket,
    };

    const response = await fetch(DOWNLOAD_URL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Download URL API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data?.downloadUrl ||
      data?.download_url ||
      data?.url ||
      data?.presignedUrl ||
      data?.presigned_url ||
      null
    );
  };

  const loadMetricsJson = async (metricsS3Path: string) => {
    try {
      const metricsPresignedUrl = await getPresignedDownloadUrl(metricsS3Path);
      if (!metricsPresignedUrl) {
        setMetricsData(null);
        setMetricsError("Could not generate URL for metrics.json");
        return;
      }

      const metricsResponse = await fetch(metricsPresignedUrl);
      if (!metricsResponse.ok) {
        throw new Error(`HTTP ${metricsResponse.status} ${metricsResponse.statusText}`);
      }

      const metricsJson = await metricsResponse.json();
      setMetricsData(metricsJson);
      setMetricsError("");
      setAutoRunLog((prev) => [...prev, "✅ Loaded metrics.json from output folder"]);
    } catch (error) {
      setMetricsData(null);
      setMetricsError((error as Error).message);
      setAutoRunLog((prev) => [
        ...prev,
        `❌ Failed to load metrics.json: ${(error as Error).message}`,
      ]);
    }
  };

  const getOutputFolderUrl = (): string => {
    const inputPath = getS3InputPath();
    if (!inputPath) return "";
    if (inputPath.endsWith("/input/") || inputPath.endsWith("/input")) {
      return inputPath.replace(/\/input\/?$/, "/output/");
    }
    return `${inputPath}output/`;
  };

  const getCustomerIdColumn = (): string => {
    return (localStorage.getItem("customerIdColumn") || "Customer_ID").trim();
  };

  const getConfigS3Uri = (): string => {
    const inputPath = getS3InputPath();
    if (!inputPath) return "";

    if (inputPath.endsWith("/input/") || inputPath.endsWith("/input")) {
      return inputPath.replace(/\/input\/?$/, "/config/") + "sample_config.json";
    }

    return `${inputPath}config/sample_config.json`;
  };

  const uploadConfigToS3 = async (
    configS3Uri: string,
    config: Record<string, unknown>
  ): Promise<string> => {
    console.log("[configUpload] requested config S3 URI:", configS3Uri);
    console.log("[configUpload] config payload:", config);

    const parsed = parseS3Url(configS3Uri);
    if (!parsed) {
      throw new Error(`Invalid config S3 path: ${configS3Uri}`);
    }

    const presignedResponse = await fetch(UPLOAD_URL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: parsed.key,
        contentType: "application/json",
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error(
        `Failed to get upload URL for config JSON: ${presignedResponse.status} ${presignedResponse.statusText}`
      );
    }

    const { uploadUrl, s3_bucket, s3_key } = await presignedResponse.json();
    console.log("[configUpload] presigned response:", {
      uploadUrl,
      s3_bucket,
      s3_key,
    });

    if (!uploadUrl) {
      throw new Error("Upload URL missing for config JSON");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload config JSON to S3: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
    }

    // Always trust backend-resolved key if present, because presign services
    // may rewrite prefixes/paths.
    if (s3_bucket && s3_key) {
      console.log("[configUpload] uploaded config S3 URI:", `s3://${s3_bucket}/${s3_key}`);
      return `s3://${s3_bucket}/${s3_key}`;
    }

    console.log("[configUpload] uploaded config S3 URI fallback:", configS3Uri);
    return configS3Uri;
  };

  const downloadFileFromS3 = async (fileName: string) => {
    try {
      const baseUrl = getOutputFolderUrl();

      let requestUrl = downloadLinks[fileName];

      if (!requestUrl) {
        // Example: s3://bucket-name/folder/
        if (baseUrl.startsWith("s3://")) {
          const s3Path = `${baseUrl}${fileName}`;
          const presignedUrl = await getPresignedDownloadUrl(s3Path);
          if (!presignedUrl) {
            throw new Error(`Could not generate download URL for ${fileName}`);
          }
          requestUrl = presignedUrl;
        } else {
          requestUrl = `${baseUrl}${fileName}`;
        }
      }

      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);

      setAutoRunLog((prev) => [
        ...prev,
        `✅ Downloaded ${fileName}`,
      ]);
    } catch (err) {
      setAutoRunLog((prev) => [
        ...prev,
        `❌ Download failed for ${fileName}: ${(err as Error).message}`,
      ]);
    }
  };

  const getUploadedFileName = (): string => {
    return localStorage.getItem("uploadedFileName") || "input_data.csv";
  };

  const runClustering = async () => {
    if (!clusterMode || !canRunModel) return;
    setIsRunning(true);
    setAutoRunComplete(false);
    setAutoRunLog(["⚡ Sending clustering job to the API..."]);
    setOutputImageUrl("");
    setPlotImageLoaded(false);
    setMetricsData(null);
    setMetricsError("");

    const modelName = clusterMode === "custom" ? customMethod : FULLY_AUTO_CONFIG.model;
    const allDynamic = dynamicFeatures.length > 0 ? dynamicFeatures : summary.selectedColumns;
    const features =
      clusterMode === "custom" && customFeatureSet.length >= 2
        ? customFeatureSet
        : allDynamic;

    if (clusterMode === "custom" && customFeatureSet.length < 2) {
      setAutoRunLog(["❌ Select at least 2 features for customized clustering."]);
      setIsRunning(false);
      return;
    }

    const parameters: Record<string, any> = {};
    if (clusterMode === "automatic") {
      parameters.auto_k = FULLY_AUTO_CONFIG.auto_k;
      parameters.max_iter = FULLY_AUTO_CONFIG.max_iter;
    } else if (modelName === "KMeans") {
      const autoK = customParams?.auto_k ?? true;
      parameters.auto_k = autoK;
      if (!autoK) {
        parameters.n_clusters = customParams?.n_clusters ?? 5;
      }
      parameters.max_iter = customParams?.max_iter ?? 300;
    } else if (modelName === "HDBSCAN") {
      parameters.auto_k = true;
      parameters.min_cluster_size = customParams?.min_cluster_size ?? 50;
      parameters.min_samples = customParams?.min_samples ?? 50;
      parameters.metric = customParams?.metric || "euclidean";
    }

    const config = {
      mode: "train",
      model: modelName,
      features,
      parameters,
    };

    setRunConfigSummary(
      `Model: ${modelName} | Features: ${features.length} selected | Parameters: ${Object.entries(parameters)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(", ")}`
    );

    localStorage.setItem("clusterConfig", JSON.stringify(config));

    const userId = getSessionUser() || localStorage.getItem("userId") || "anonymous";
    const sessionId = getSessionId() || localStorage.getItem("sessionId") || `session-${Date.now()}`;
    const inputDataPath = getS3InputPath();
    const fileName = getUploadedFileName();
    const idCol = getCustomerIdColumn();
    const configS3Uri = getConfigS3Uri();
    let uploadedConfigS3Uri = configS3Uri;

    if (!inputDataPath || !configS3Uri) {
      setAutoRunLog(["❌ Missing input_data_path. Upload data first."]);
      setIsRunning(false);
      return;
    }

    try {
      setAutoRunLog((prev) => [...prev, "⚡ Uploading clustering config JSON to S3..."]);
      uploadedConfigS3Uri = await uploadConfigToS3(configS3Uri, config);
      console.log("[runClustering] config uploaded to:", uploadedConfigS3Uri);
      setAutoRunLog((prev) => [
        ...prev,
        `✅ Config uploaded to ${uploadedConfigS3Uri}`,
      ]);
    } catch (error) {
      console.error("[runClustering] config upload failed:", (error as Error).message);
      setAutoRunLog((prev) => [
        ...prev,
        `❌ Config upload failed: ${(error as Error).message}`,
      ]);
      setIsRunning(false);
      return;
    }

    const requestBody = {
      user_id: userId,
      session_id: sessionId,
      input_data_path: inputDataPath,
      file_name: fileName,
      config_s3_uri: uploadedConfigS3Uri,
      id_col: idCol,
    };

    console.log("[runClustering] requestBody:", requestBody);
    setAutoRunLog([
      "⚡ Request payload prepared.",
      `Model: ${modelName}`,
      `Features: ${features.join(", ")}`,
      `Parameters: ${JSON.stringify(parameters)}`,
    ]);

    try {
      const response = await fetch(getClusterApiUrl("/run-job"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("[runClustering] response:", response.status, data);

      if (!response.ok) {
        throw new Error(data?.message || response.statusText || "Run job failed");
      }

      const returnedJobName = (data.job_name || data.jobName || data.id || "").toString();
      if (returnedJobName) {
        setLastSubmittedJobName(returnedJobName);
        localStorage.setItem("lastClusterJobName", returnedJobName);
      }
      setAutoRunLog((prev) => [
        ...prev,
        "✅ Clustering job submitted successfully.",
        `Job name: ${returnedJobName}`,
      ]);
      setJobStatus("pending");
      setIsRunning(false);

      if (returnedJobName) {
        startStatusPolling(returnedJobName);
      } else {
        setAutoRunLog((prev) => [...prev, "❌ No job name received; cannot poll status."]);
        setIsRunning(false);
      }
    } catch (error) {
      const message = (error as Error).message;
      console.error("[runClustering] error:", message);
      setAutoRunLog((prev) => [
        ...prev,
        `❌ Clustering API error: ${message}`,
      ]);
      setJobStatus("Failed");
    } finally {
      setIsRunning(false);
    }
  };

  const startStatusPolling = (name: string) => {
    if (statusPollId) {
      window.clearInterval(statusPollId);
    }

    setJobStatus("in_progress");
    const id = window.setInterval(async () => {
      try {
        const response = await fetch(getClusterApiUrl(`/status/${encodeURIComponent(name)}`));
        const result = await response.json();
        const status = (result.status || "").toString();

        console.log("[pollStatus]", name, status, result);

        setAutoRunLog((prev) => [...prev, `Status check: ${status}`]);

        if (status.toLowerCase() === "completed") {
          setJobStatus("Completed");
          setAutoRunComplete(true);

          const returnedOutputUrl =
            (result.output_url as string) ||
            (result.output_image_url as string) ||
            (result.pca_plot_url as string) ||
            "";

          const imageS3Path =
            (result.pca_plot_s3_path as string) ||
            (result.output_s3_path as string) ||
            (returnedOutputUrl.startsWith("s3://") ? returnedOutputUrl : "") ||
            getOutputImageS3Path();

          try {
            const presignedUrl = await getPresignedDownloadUrl(imageS3Path);
            if (presignedUrl && presignedUrl.startsWith("http")) {
              setOutputImageUrl(presignedUrl);
              setPlotImageLoaded(false);
              setAutoRunLog((prev) => [...prev, "✅ Loaded presigned image URL for pca_plot.png"]);
            } else {
              setOutputImageUrl("");
              setPlotImageLoaded(false);
              setAutoRunLog((prev) => [...prev, "❌ Could not get a valid HTTP presigned URL for pca_plot.png"]);
            }
          } catch (error) {
            setOutputImageUrl("");
            setPlotImageLoaded(false);
            setAutoRunLog((prev) => [
              ...prev,
              `❌ Presigned image URL error: ${(error as Error).message}`,
            ]);
          }

          const metricsS3Path =
            (result.metrics_s3_path as string) ||
            (result.metrics_path as string) ||
            getMetricsS3Path();
          await loadMetricsJson(metricsS3Path);

          const returnedLinks = (result.presigned_urls as Record<string, string>) || {};
          setDownloadLinks(returnedLinks);

          window.clearInterval(id);
          setStatusPollId(null);
        } else if (status.toLowerCase() === "failed") {
          setJobStatus("Failed");
          setAutoRunLog((prev) => [...prev, "Job failed."]);
          window.clearInterval(id);
          setStatusPollId(null);
        } else {
          setJobStatus("in_progress");
        }
      } catch (err) {
        console.error("[pollStatus] error", err);
        setAutoRunLog((prev) => [...prev, `Status check error: ${(err as Error).message}`]);
      }
    }, 20000);

    setStatusPollId(id);
  };

  const handleRetryClustering = () => {
    setJobStatus(null);
    setAutoRunComplete(false);
    runClustering();
  };

  const handleResumeStatusPolling = () => {
    if (!lastSubmittedJobName) return;
    setAutoRunComplete(false);
    setJobStatus("in_progress");
    startStatusPolling(lastSubmittedJobName);
  };

  const normalizeColumn = (value: string) => value.trim().toLowerCase();

  const getColumnsForInsightMode = (mode: "static" | "dynamic"): string[] => {
    const rawDict = JSON.parse(localStorage.getItem("dataDictionary") || "{}") as Record<
      string,
      Record<string, string> | string[]
    >;
    const modeData = rawDict?.[mode] || {};
    const columns = Array.isArray(modeData) ? modeData : Object.keys(modeData);
    return columns.filter((column) => column && column.trim().length > 0);
  };

  const openInsightModeModal = () => {
    const storedMode = (localStorage.getItem("insightMode") as "static" | "dynamic" | null) || null;
    const storedSelected = JSON.parse(localStorage.getItem("selectedColumns") || "[]") as string[];

    setShowInsightModeModal(true);
    setInsightSelectionError("");
    setInsightModeChoice(storedMode);

    if (!storedMode) {
      setInsightModeColumns([]);
      setInsightSelectedColumns([]);
      return;
    }

    const modeColumns = getColumnsForInsightMode(storedMode);
    const modeColumnLookup = new Map(modeColumns.map((column) => [normalizeColumn(column), column]));
    const filteredStored = storedSelected
      .map((column) => modeColumnLookup.get(normalizeColumn(column)) || null)
      .filter((column): column is string => Boolean(column));

    setInsightModeColumns(modeColumns);
    setInsightSelectedColumns(filteredStored);
  };

  const handleInsightModeSelect = (mode: "static" | "dynamic") => {
    const modeColumns = getColumnsForInsightMode(mode);
    const modeColumnLookup = new Map(modeColumns.map((column) => [normalizeColumn(column), column]));
    const currentSelected = insightSelectedColumns
      .map((column) => modeColumnLookup.get(normalizeColumn(column)) || null)
      .filter((column): column is string => Boolean(column));

    setInsightModeChoice(mode);
    setInsightModeColumns(modeColumns);
    setInsightSelectedColumns(currentSelected);
    setInsightSelectionError("");
  };

  const toggleInsightColumn = (column: string) => {
    setInsightSelectionError("");
    setInsightSelectedColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((value) => value !== column);
      }
      return [...prev, column];
    });
  };

  const handleInsightModeProceed = () => {
    if (!insightModeChoice) {
      setInsightSelectionError("Please choose static or dynamic mode.");
      return;
    }

    if (insightSelectedColumns.length === 0) {
      setInsightSelectionError("Please select at least one column to continue.");
      return;
    }

    localStorage.setItem("selectedColumns", JSON.stringify(insightSelectedColumns));
    localStorage.setItem("insightMode", insightModeChoice);
    setShowInsightModeModal(false);
    navigate("/analysis", { state: { mode: insightModeChoice } });
  };

  useEffect(() => {
    return () => {
      if (statusPollId) {
        window.clearInterval(statusPollId);
      }
    };
  }, [statusPollId]);

  useEffect(() => {
    if (!showClusterLoader) {
      setLoaderMessageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoaderMessageIndex((prev) => (prev + 1) % activeLoaderMessages.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [activeLoaderMessages.length, showClusterLoader]);

  return (
  <div className="min-h-screen bg-[#05101c] text-white flex flex-col">
      <Header />

      <div className="flex h-screen w-full bg-[#08121f]">
        <motion.div
          animate={{ width: isSidebarOpen ? 340 : 70 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#0b1c2e]/90 border-r border-white/10 flex flex-col"
        >
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-[#132030] transition"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>

          {isSidebarOpen && (
            <span className="ml-2 text-lg font-semibold tracking-wide">
              Controls
            </span>
          )}
        </div>

        <div
          className="mt-6 px-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600/40 scrollbar-track-transparent pr-2"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          <div
            onClick={() => navigate("/upload")}
            className={`p-3 rounded-lg bg-[#132030] border border-white/10 cursor-pointer transition ${
              isRunning ? "opacity-50 pointer-events-none" : "hover:border-blue-400"
            }`}
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <i className="fas fa-upload"></i>
                <span>Upload Dataset</span>
              </div>
            ) : (
              <i className="fas fa-upload text-lg"></i>
            )}
          </div>

          <div
            className="relative p-3 rounded-l-lg rounded-r-none bg-[#08121f] border-t border-b border-l border-white/10 border-r-0 -mr-px shadow-[inset_-6px_0_0_#08121f]"
          >
            <div className="flex items-center gap-2 text-sm text-blue-200 font-semibold">
              <span className="h-6 w-1 rounded-full bg-blue-400" />
              <i className="fas fa-project-diagram"></i>
              {isSidebarOpen && <span>Cluster Configuration</span>}
            </div>
          </div>

          <div
            onClick={() => autoRunComplete && openInsightModeModal()}
            className={`p-3 rounded-lg bg-[#132030] border border-white/10 transition ${
              !autoRunComplete || isRunning
                ? "opacity-50 pointer-events-none"
                : "cursor-pointer hover:border-blue-400"
            }`}
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <i className="fas fa-chart-bar"></i>
                <span>Profiling/Insight Generation</span>
              </div>
            ) : (
              <i className="fas fa-chart-bar text-lg"></i>
            )}
          </div>
        </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-10 w-full">
          <SectionHeader
            title="Cluster Configuration"
            sub="Run clustering on the uploaded dataset before generating insights."
          />

        <div className={cardBase}>
          <h3 className="text-xl font-semibold mb-4">Cluster Type</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setClusterMode("automatic");
                setAutoRunComplete(false);
                setAutoRunLog([]);
              }}
              disabled={isRunning}
              className={`text-left px-6 py-4 rounded-xl border transition shadow-md ${
                clusterMode === "automatic"
                  ? "border-blue-500 bg-blue-600/30"
                  : "border-white/10 bg-[#0f2236] hover:border-blue-400"
              } ${isRunning ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <p className="text-white font-semibold text-lg">Fully Automatic</p>
              <p className="text-gray-300 text-sm mt-2">
                Let the model decide the optimal number of clusters.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setClusterMode("custom");
                setAutoRunComplete(false);
                setAutoRunLog([]);
              }}
              disabled={isRunning}
              className={`text-left px-6 py-4 rounded-xl border transition shadow-md ${
                clusterMode === "custom"
                  ? "border-blue-500 bg-blue-600/30"
                  : "border-white/10 bg-[#0f2236] hover:border-blue-400"
              } ${isRunning ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <p className="text-white font-semibold text-lg">Customized</p>
              <p className="text-gray-300 text-sm mt-2">
                Choose how many clusters you want to generate.
              </p>
            </button>
          </div>

          {clusterMode === "automatic" && (
            <div className="mt-6 rounded-xl border border-blue-300/20 bg-[#0b1c2e]/70 p-5 space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-200/70">Fixed Configuration — Read Only</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-[#0f2236] px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Model</p>
                  <p className="text-white font-semibold">Clustering Algorithm</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f2236] px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Auto K</p>
                  <p className="text-emerald-300 font-semibold">Enabled</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f2236] px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Max Iterations</p>
                  <p className="text-white font-semibold">{FULLY_AUTO_CONFIG.max_iter}</p>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0f2236] px-4 py-3">
                <p className="text-xs text-gray-400 mb-2">Features</p>
                {dynamicFeatures.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dynamicFeatures.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-blue-600/40 border border-blue-400/40 px-3 py-1 text-xs text-blue-100 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">All uploaded columns will be used ({summary.selectedColumns.length} columns).</p>
                )}
              </div>
            </div>
          )}

          {clusterMode === "custom" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Clustering Method
                  </label>
                  <div className="rounded-lg border border-white/10 bg-[#132030] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white font-semibold">Clustering Algorithm</p>
                      <div className="relative group">
                        <button
                          type="button"
                          className="px-3 py-2 bg-[#0b1c2e] border border-white/10 rounded-lg text-white hover:bg-[#132030] transition"
                          title={selectedModel?.description || "Model Information"}
                        >
                          <i className="fas fa-info-circle"></i>
                        </button>
                        {selectedModel && (
                          <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0f172a] p-3 text-xs text-gray-200 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                            {selectedModel.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedModel && (
                  <div className="rounded-3xl border border-white/10 bg-[#0b1c2e]/80 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                    <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-2">
                        Model Parameters
                      </label>
                      <p className="text-xs text-slate-400">
                        Configure the selected clustering model using the available parameters.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {effectiveParameters.map((param: any) => (
                        <div key={param.name}>
                          <label className="block text-sm text-gray-400 mb-2">
                            {param.label}
                          </label>
                          {param.type === "toggle" && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={customParams[param.name] || false}
                                onChange={(e) =>
                                  setCustomParams((prev) => ({
                                    ...prev,
                                    [param.name]: e.target.checked,
                                  }))
                                }
                                disabled={isRunning}
                                className="accent-blue-500"
                              />
                              <span className="text-white text-sm">
                                {customParams[param.name] ? "Enabled" : "Disabled"}
                              </span>
                            </label>
                          )}
                          {param.type === "slider" && (
                            <div>
                              <div className="relative pt-7 px-1">
                                <div
                                  className="pointer-events-none absolute top-0 -translate-x-1/2"
                                  style={{
                                    left: `${(((customParams[param.name] as number) - param.min!) / (param.max! - param.min!)) * 100}%`,
                                  }}
                                >
                                  <div className="rounded-full border border-emerald-300/60 bg-emerald-500 px-3 py-0.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.5)]">
                                    {customParams[param.name]}
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min={param.min!}
                                  max={param.max!}
                                  step={param.step!}
                                  value={customParams[param.name]}
                                  onChange={(e) =>
                                    setCustomParams((prev) => ({
                                      ...prev,
                                      [param.name]: Number(e.target.value),
                                    }))
                                  }
                                  disabled={isRunning}
                                  className={`w-full accent-emerald-500 ${
                                    isRunning ? "opacity-60 cursor-not-allowed" : ""
                                  }`}
                                />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                                <span>{param.min!}</span>
                                <span>{param.max!}</span>
                              </div>
                            </div>
                          )}
                          {param.type === "dropdown" && (
                            <select
                              value={customParams[param.name]}
                              onChange={(e) =>
                                setCustomParams((prev) => ({
                                  ...prev,
                                  [param.name]: e.target.value,
                                }))
                              }
                              disabled={isRunning}
                              className={`w-full bg-[#0b1c2e] border border-white/10 rounded-lg px-3 py-2 text-white ${
                                isRunning ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            >
                              {((param as any).options || []).map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {param.type === "number_input" && (
                            <input
                              type="number"
                              value={customParams[param.name]}
                              onChange={(e) =>
                                setCustomParams((prev) => ({
                                  ...prev,
                                  [param.name]: Number(e.target.value),
                                }))
                              }
                              disabled={isRunning}
                              className={`w-full bg-[#0b1c2e] border border-white/10 rounded-lg px-3 py-2 text-white ${
                                isRunning ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            />
                          )}
                          {param.description && (
                            <p className="mt-1 text-xs text-gray-500">
                              {param.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-400">
                    Select Features for Clustering
                  </label>
                  <label
                    className={`flex items-center gap-2 text-xs text-gray-300 ${
                      isRunning || dynamicFeatures.length === 0
                        ? "opacity-60 pointer-events-none"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={allFeaturesSelected}
                      onChange={() =>
                        setCustomFeatureSet(
                          allFeaturesSelected ? [] : [...dynamicFeatures]
                        )
                      }
                      disabled={isRunning || dynamicFeatures.length === 0}
                    />
                    <span>Select All</span>
                  </label>
                </div>
                <div
                  className={`w-full bg-[#0b1c2e] border border-white/10 rounded-lg px-3 py-3 text-white max-h-44 overflow-y-auto ${
                    isRunning ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  {dynamicFeatures.length === 0 && (
                    <p className="text-xs text-gray-400">No dynamic features found.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {dynamicFeatures.map((feature) => {
                      const selected = customFeatureSet.includes(feature);
                      return (
                        <button
                          key={feature}
                          type="button"
                          onClick={() =>
                            setCustomFeatureSet((prev) =>
                              prev.includes(feature)
                                ? prev.filter((item) => item !== feature)
                                : [...prev, feature]
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                            selected
                              ? "bg-blue-600/60 border-blue-400 text-white"
                              : "bg-[#132030] border-white/10 text-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {feature}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {clusterMode === "custom" && !hasCustomFeatures && (
                  <p className="mt-2 text-xs text-amber-300">
                    Please select at least 2 features for clustering.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`${cardBase} mt-6 flex items-center justify-between`}>
          <div>
            <p className="text-white font-semibold">Selected Cluster Mode</p>
            <p className="text-gray-400 text-sm">{clusterLabel}</p>
          </div>
          <div className="flex gap-3">
            <PrimaryButton
              label={isRunning ? "Running..." : "Run Clustering"}
              onClick={runClustering}
              disabled={isRunning || !canRunClustering}
              loading={isRunning}
            />
          </div>
        </div>

        {clusterMode && (isRunning || jobStatus !== null || autoRunComplete || outputImageUrl !== "" || metricsData !== null || metricsError !== "") && (
          <div
            className={`${cardBase} mt-6 space-y-4 border border-blue-500/30 bg-gradient-to-br from-[#0b1c2e] via-[#0b1c2e]/80 to-[#0a1320]`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {jobStatus === "Completed" && plotImageLoaded ? "Cluster Results" : "Clustering Progress"}
              </h4>
            </div>

            {showClusterLoader && (
              <div className="overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_35%),linear-gradient(180deg,rgba(7,19,31,0.96),rgba(9,15,26,0.98))] p-6 shadow-[0_24px_80px_-40px_rgba(56,189,248,0.45)]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-5">
                    <div className="relative h-20 w-20 shrink-0">
                      <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
                      <motion.div
                        className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-300 border-r-blue-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                      />
                      <motion.div
                        className="absolute inset-4 rounded-full border border-emerald-300/35"
                        animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.45, 0.9, 0.45] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-[0.18em] text-cyan-100">
                        {displayLoaderProgress}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
                        <span className="inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
                        {loaderPhase === "preparing"
                          ? "Initializing"
                          : loaderPhase === "running"
                          ? "Backend Processing"
                          : "Finalizing Output"}
                      </div>
                      <p className="max-w-2xl text-xl font-semibold leading-snug text-white">
                        {activeLoaderMessages[loaderMessageIndex]}
                      </p>
                      <p className="text-sm text-slate-300/85">
                        It will take a few minutes to complete. Please wait while the backend finishes processing.
                      </p>
                      <p className="text-sm text-slate-400/90">
                        {runConfigSummary || "Model and parameter summary will appear here once run starts."}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-300/75">
                      <span>Pipeline Status</span>
                      <span>{displayLoaderProgress}%</span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-slate-900/90">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-300"
                        animate={{ width: `${displayLoaderProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ["-120%", "420%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-300/85">
                      <div className="flex items-center justify-between">
                        <span>Config stored</span>
                        <span>{loaderPhase === "preparing" ? "In progress" : "Done"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Job execution</span>
                        <span>{loaderPhase === "running" ? "Running" : loaderPhase === "preparing" ? "Queued" : "Done"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Artifacts loading</span>
                        <span>{loaderPhase === "finalizing" ? "Preparing" : loaderPhase === "running" || loaderPhase === "preparing" ? "Pending" : "Done"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {jobStatus === "Completed" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-300/35 bg-emerald-900/20 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-emerald-200/85">
                    <span>Pipeline Status</span>
                    <span>Completed</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-emerald-950/70">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400" />
                  </div>
                  <p className="mt-2 text-sm text-emerald-100/90">
                    Clustering is completed and result artifacts are ready.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-[#0b1c2e]/80">
                  <h4 className="text-lg text-white mb-3">Metric Summary</h4>
                  {metricsError ? (
                    <p className="text-sm text-rose-300">Unable to load metrics.json: {metricsError}</p>
                  ) : metricScoreValue !== null ? (
                    <div className="rounded-2xl border border-violet-300/30 bg-gradient-to-br from-violet-900/45 via-purple-900/35 to-indigo-900/30 p-5 shadow-[0_20px_60px_-40px_rgba(168,85,247,0.7)]">
                      <div className="flex flex-wrap items-end justify-between gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-violet-200/80">Primary Metric</p>
                          <p className="mt-1 text-2xl font-semibold text-white">{metricGuide.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-violet-200/80">Score</p>
                          <p className={`mt-1 text-3xl font-bold ${metricScoreColorClass}`}>{metricScoreValue.toFixed(3)}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-violet-200/20 bg-black/20 p-4">
                        <p className="text-sm font-semibold text-violet-100">
                          {metricInterpretation?.quality || "Interpretation unavailable"}
                        </p>
                        <p className="mt-2 text-sm text-violet-100/90">
                          {metricInterpretation?.meaning || "No interpretation matched the current metric range."}
                        </p>
                        <p className="mt-2 text-sm text-violet-200/90">
                          {metricInterpretation?.recommendation || "No recommendation available."}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-violet-100/90">
                        <p>
                          <span className="font-semibold text-violet-50">Description:</span> {metricGuide.description}
                        </p>
                        {metricGuide.business_mapping && (
                          <p>
                            <span className="font-semibold text-violet-50">Business Context:</span> {metricGuide.business_mapping}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">Loading metric summary...</p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-gray-400">Cluster visualization (generated image)</p>
                    <button
                      type="button"
                      onClick={() => setIsClusterMaximized(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-300/45 bg-[#0b1c2e]/75 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-600/25"
                    >
                      <i className="fas fa-expand text-[11px]"></i>
                      <span>Maximize</span>
                    </button>
                  </div>
                  <div className="relative w-full overflow-hidden rounded-xl border border-blue-400/40 bg-[#0f1725] p-6">
                    {outputImageUrl ? (
                      <img
                        src={outputImageUrl}
                        alt="PCA Plot"
                        className="mx-auto max-h-[70vh] w-full object-contain"
                        onLoad={() => setPlotImageLoaded(true)}
                        onError={() => {
                          setPlotImageLoaded(false);
                          setAutoRunLog((prev) => [...prev, "❌ Unable to load pca_plot.png from presigned URL."]);
                        }}
                      />
                    ) : (
                      <p className="text-sm text-slate-300">
                        Image URL is not available yet. Please wait for status refresh or rerun clustering.
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-[#0b1c2e]/80">
                  <h4 className="text-lg text-white mb-3">Download output files</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadFileFromS3("clustered_output.csv")}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Download Cluster Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {jobStatus === "Failed" && (
              <div className="mt-4 p-4 rounded-xl border border-rose-300/40 bg-rose-950/10">
                <p className="text-sm text-rose-300">Job failed. No cluster visualization available.</p>
                <p className="mt-1 text-xs text-rose-200/80">
                  You can retry a fresh run or resume polling if the backend job may still be processing.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRetryClustering}
                    className="rounded-lg bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                  >
                    Retry Clustering
                  </button>
                  <button
                    type="button"
                    onClick={handleResumeStatusPolling}
                    disabled={!lastSubmittedJobName}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      lastSubmittedJobName
                        ? "border border-violet-300/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                        : "cursor-not-allowed border border-slate-500/30 bg-slate-700/40 text-slate-300"
                    }`}
                  >
                    Resume Status Check
                  </button>
                </div>
              </div>
            )}

            {isClusterMaximized && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
                <div className="h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-blue-400/35 bg-[#0b1523] shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-semibold text-white">Cluster Visualization (Maximized)</p>
                    <button
                      type="button"
                      onClick={() => setIsClusterMaximized(false)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                    >
                      <i className="fas fa-times"></i>
                      <span>Close</span>
                    </button>
                  </div>
                  <div className="flex h-[calc(85vh-56px)] w-full items-center justify-center p-4">
                    {outputImageUrl ? (
                      <img
                        src={outputImageUrl}
                        alt="PCA Plot"
                        className="max-h-full w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">Plot image is not available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!canRunModel && (
          <p className="mt-6 text-sm text-amber-300">
            Upload data and select columns to enable clustering.
          </p>
        )}
        {showInsightModeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07151f] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-white">Choose Insight Mode</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Select whether you want static or dynamic profiling for the analysis page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInsightModeModal(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleInsightModeSelect("static")}
                  className={`rounded-3xl border px-6 py-5 text-left text-white transition hover:border-blue-400 hover:bg-blue-600/20 ${
                    insightModeChoice === "static"
                      ? "border-blue-400 bg-blue-600/20"
                      : "border-white/10 bg-[#0b1c2e]"
                  }`}
                >
                  <p className="text-lg font-semibold">Static</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Use predefined customer attributes and static insight columns.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsightModeSelect("dynamic")}
                  className={`rounded-3xl border px-6 py-5 text-left text-white transition hover:border-blue-400 hover:bg-blue-600/20 ${
                    insightModeChoice === "dynamic"
                      ? "border-blue-400 bg-blue-600/20"
                      : "border-white/10 bg-[#0b1c2e]"
                  }`}
                >
                  <p className="text-lg font-semibold">Dynamic</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Use transaction-driven attributes and dynamic insight columns.
                  </p>
                </button>
              </div>

              {insightModeChoice && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1c2e]/70 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Select Columns</p>
                      <p className="text-xs text-slate-400">
                        {insightModeChoice === "static" ? "Static" : "Dynamic"} columns available: {insightModeColumns.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInsightSelectedColumns(insightModeColumns)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsightSelectedColumns([])}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#07151f] p-3">
                    {insightModeColumns.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No columns found for this mode in the data dictionary.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {insightModeColumns.map((column) => {
                          const selected = insightSelectedColumns.includes(column);
                          return (
                            <button
                              key={column}
                              type="button"
                              onClick={() => toggleInsightColumn(column)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                selected
                                  ? "border-blue-300 bg-blue-500/30 text-blue-100"
                                  : "border-white/10 bg-[#0b1c2e] text-slate-300 hover:border-blue-400"
                              }`}
                            >
                              {column}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-300">
                    Selected columns: {insightSelectedColumns.length}
                  </p>
                  {insightSelectionError && (
                    <p className="mt-2 text-xs text-rose-300">{insightSelectionError}</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleInsightModeProceed}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Continue to Analysis
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
