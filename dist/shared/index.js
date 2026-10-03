// src/shared/types.ts
var ConsentType = /* @__PURE__ */ ((ConsentType2) => {
  ConsentType2["OAuth"] = "oauth";
  ConsentType2["BrowserPermission"] = "browser-permission";
  ConsentType2["Cookie"] = "cookie";
  ConsentType2["Policy"] = "policy";
  ConsentType2["Terms"] = "terms";
  return ConsentType2;
})(ConsentType || {});
var GrantStatus = /* @__PURE__ */ ((GrantStatus2) => {
  GrantStatus2["Pending"] = "pending";
  GrantStatus2["Granted"] = "granted";
  GrantStatus2["Denied"] = "denied";
  GrantStatus2["Revoked"] = "revoked";
  GrantStatus2["Unknown"] = "unknown";
  return GrantStatus2;
})(GrantStatus || {});
var EvidenceSource = /* @__PURE__ */ ((EvidenceSource2) => {
  EvidenceSource2["DOM"] = "dom";
  EvidenceSource2["Network"] = "network";
  EvidenceSource2["Storage"] = "storage";
  EvidenceSource2["Heuristic"] = "heuristic";
  EvidenceSource2["User"] = "user";
  return EvidenceSource2;
})(EvidenceSource || {});
var ExtractionMethod = /* @__PURE__ */ ((ExtractionMethod2) => {
  ExtractionMethod2["TextContent"] = "text-content";
  ExtractionMethod2["Attribute"] = "attribute";
  ExtractionMethod2["Regex"] = "regex";
  ExtractionMethod2["MetaTag"] = "meta-tag";
  ExtractionMethod2["URLParam"] = "url-param";
  ExtractionMethod2["DataAttribute"] = "data-attribute";
  ExtractionMethod2["Heuristic"] = "heuristic";
  return ExtractionMethod2;
})(ExtractionMethod || {});
var ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
  ErrorSeverity2["Info"] = "info";
  ErrorSeverity2["Warning"] = "warning";
  ErrorSeverity2["Error"] = "error";
  ErrorSeverity2["Critical"] = "critical";
  return ErrorSeverity2;
})(ErrorSeverity || {});

// src/shared/errors.ts
function createAdapterError(adapter, message, code, severity = "error" /* Error */, context) {
  return {
    adapter,
    message,
    code,
    severity,
    context,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

export { ConsentType, ErrorSeverity, EvidenceSource, ExtractionMethod, GrantStatus, createAdapterError };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map