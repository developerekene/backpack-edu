/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import React, { useState } from "react";
import { Course } from "../../types";
import { useAppContext } from "../../store/AppContext";
import { Award, Download, Settings, Palette, Layout, Type } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { FileUpload } from "./FileUpload";

const CertificatePreviewWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // 32px for the padding inside the container
        const availableWidth = width - 32;
        setScale(Math.min(availableWidth / 800, 1));
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center overflow-hidden"
    >
      <div
        style={{ width: `${800 * scale}px`, height: `${565 * scale}px` }}
        className="relative transition-all duration-200"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: "800px",
            height: "565px",
          }}
          className="absolute top-0 left-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export const CourseCertificate = ({
  course,
  isStudent,
  progress,
}: {
  course: Course;
  isStudent: boolean;
  progress: number;
}) => {
  const { updateCourse, organizations } = useAppContext();
  const courseOrg = organizations.find((o) => o.id === course.orgId);
  const defaultOrgName = courseOrg?.name || "Organization Name";
  const defaultQualificationTitle =
    course.qualificationTitle || "Certificate of Completion";
  const { currentUser } = useAuth();

  const config = course.certificateConfig || {
    enabled: false,
    customText: "Certificate of Completion",
    orgName: defaultOrgName,
    gradeLevel: "",
    qualificationTitle: defaultQualificationTitle,
    signatureUrl: "",
    authorizedSealUrl: "",
    themeColor: "#4f46e5",
    textColor: "#0f172a",
    layout: "classic" as const,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [enabled, setEnabled] = useState(config.enabled || false);
  const [customText, setCustomText] = useState(
    config.customText || "Certificate of Completion",
  );
  const [orgName, setOrgName] = useState(config.orgName || defaultOrgName);
  const [gradeLevel, setGradeLevel] = useState(config.gradeLevel || "");
  const [qualificationTitle, setQualificationTitle] = useState(
    config.qualificationTitle || defaultQualificationTitle,
  );
  const [signatureUrl, setSignatureUrl] = useState(config.signatureUrl || "");
  const [authorizedSealUrl, setAuthorizedSealUrl] = useState(
    config.authorizedSealUrl || "",
  );
  const [themeColor, setThemeColor] = useState(config.themeColor || "#4f46e5");
  const [textColor] = useState(config.textColor || "#0f172a");
  const [layout, setLayout] = useState<
    "classic" | "modern" | "minimal" | "elegant" | "creative"
  >(
    (config.layout as
      | "classic"
      | "modern"
      | "minimal"
      | "elegant"
      | "creative") || "classic",
  );

  const handleSave = async () => {
    await updateCourse(course.id, {
      certificateConfig: {
        enabled,
        customText,
        orgName,
        gradeLevel,
        qualificationTitle,
        signatureUrl,
        authorizedSealUrl,
        themeColor,
        textColor,
        layout,
      },
    });
    setIsEditing(false);
  };

  const handleDownload = () => {
    alert("Certificate downloaded successfully!");
  };

  const studentName = isStudent ? currentUser?.name : "[Student Name]";
  const certId = isStudent
    ? `CERT-${course.id.substring(0, 6).toUpperCase()}-${currentUser?.id.substring(0, 6).toUpperCase()}`
    : `CERT-[ID]`;
  const dateIssued =
    isStudent && progress >= 100
      ? new Date().toLocaleDateString()
      : "[Date of Issue]";

  const renderCertificatePreview = () => {
    const primaryColor = themeColor;
    const fontColor = textColor;

    let containerClasses: string;
    let content: React.ReactNode;

    if (layout === "classic") {
      containerClasses =
        "w-full h-full bg-white border-[12px] border-double p-8 flex flex-col relative shadow-xl transition-all duration-300";
      content = (
        <>
          {authorizedSealUrl && (
            <div className="absolute top-8 right-8 w-24 h-24 opacity-20 pointer-events-none">
              <img
                src={authorizedSealUrl}
                alt="Seal"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div
            className="text-center flex-1 flex flex-col justify-center"
            style={{ color: fontColor }}
          >
            <div
              className="text-sm uppercase tracking-widest font-bold mb-6"
              style={{ color: primaryColor }}
            >
              {orgName || defaultOrgName}
            </div>

            <div className="text-4xl sm:text-5xl font-serif mb-8">
              {customText}
            </div>

            <div className="text-sm opacity-70 mb-2">This certifies that</div>
            <div
              className="text-2xl font-bold mb-6 italic"
              style={{ color: primaryColor }}
            >
              {studentName}
            </div>

            <div className="text-sm opacity-70 mb-2">
              has successfully completed
            </div>
            <div className="text-xl font-bold mb-2">
              {qualificationTitle || "Certificate of Excellence"}
            </div>
            <div className="text-md font-semibold opacity-80 mb-2">
              in {course.title}
            </div>
            {gradeLevel && (
              <div className="text-md opacity-80 mb-8">
                Grade Level: {gradeLevel}
              </div>
            )}
          </div>

          <div
            className="flex justify-between items-end border-t pt-6 mt-8"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <div className="text-left" style={{ color: fontColor }}>
              <div className="text-xs opacity-60 font-mono mb-1">
                ID: {certId}
              </div>
              <div className="text-xs opacity-60 font-mono">
                Date: {dateIssued}
              </div>
            </div>

            {signatureUrl ? (
              <div className="text-center">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="h-12 object-contain mb-2"
                />
                <div
                  className="text-xs uppercase tracking-wider font-bold border-t pt-1"
                  style={{ color: fontColor, borderColor: `${primaryColor}40` }}
                >
                  Authorized Signature
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div
                  className="h-12 mb-2 border-b w-32 mx-auto"
                  style={{ borderColor: `${primaryColor}40` }}
                ></div>
                <div
                  className="text-xs uppercase tracking-wider font-bold"
                  style={{ color: fontColor }}
                >
                  Authorized Signature
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (layout === "modern") {
      containerClasses =
        "w-full h-full bg-white p-8 flex flex-col relative shadow-2xl overflow-hidden rounded-2xl transition-all duration-300";
      content = (
        <>
          <div
            className="absolute top-0 left-0 w-32 h-full opacity-10"
            style={{ backgroundColor: primaryColor }}
          ></div>
          <div
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: primaryColor }}
          ></div>

          {authorizedSealUrl && (
            <div className="absolute bottom-8 right-8 w-32 h-32 opacity-10 pointer-events-none">
              <img
                src={authorizedSealUrl}
                alt="Seal"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div
            className="relative z-10 flex flex-col h-full pl-8"
            style={{ color: fontColor }}
          >
            <div className="flex items-center space-x-4 mb-12">
              <div
                className="w-12 h-1 bg-current"
                style={{ color: primaryColor }}
              ></div>
              <div
                className="text-sm uppercase tracking-widest font-bold"
                style={{ color: primaryColor }}
              >
                {orgName || defaultOrgName}
              </div>
            </div>

            <div
              className="text-5xl font-black tracking-tight mb-8"
              style={{ color: primaryColor }}
            >
              {customText}
            </div>

            <div className="flex-1">
              <div className="text-sm uppercase tracking-wider font-bold opacity-60 mb-1">
                Presented to
              </div>
              <div className="text-3xl font-bold mb-8">{studentName}</div>

              <div className="text-sm uppercase tracking-wider font-bold opacity-60 mb-1">
                For successfully completing
              </div>
              <div className="text-xl font-bold mb-1">
                {qualificationTitle || "Certificate of Excellence"}
              </div>
              <div className="text-lg opacity-80 mb-6">{course.title}</div>

              {gradeLevel && (
                <div
                  className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-8"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }}
                >
                  Grade: {gradeLevel}
                </div>
              )}
            </div>

            <div className="flex justify-between items-end mt-8">
              <div
                className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100"
                style={{ color: fontColor }}
              >
                <div className="text-xs opacity-60 font-mono mb-1">
                  CERT_ID // {certId}
                </div>
                <div className="text-xs opacity-60 font-mono">
                  ISSUED // {dateIssued}
                </div>
              </div>

              {signatureUrl ? (
                <div className="text-right">
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="h-12 object-contain ml-auto mb-2"
                  />
                  <div className="text-xs uppercase tracking-wider font-bold opacity-60">
                    Authorized Signature
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <div
                    className="h-12 mb-2 border-b w-32 ml-auto"
                    style={{ borderColor: `${primaryColor}40` }}
                  ></div>
                  <div className="text-xs uppercase tracking-wider font-bold opacity-60">
                    Authorized Signature
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      );
    } else if (layout === "elegant") {
      containerClasses =
        "w-full h-full bg-[#fdfbf7] p-6 flex flex-col relative shadow-xl transition-all duration-300";
      content = (
        <div
          className="w-full h-full border-[6px] p-2 flex flex-col relative"
          style={{ borderColor: primaryColor }}
        >
          <div
            className="w-full h-full border border-opacity-50 p-8 flex flex-col relative"
            style={{ borderColor: primaryColor }}
          >
            {authorizedSealUrl && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-5 pointer-events-none">
                <img
                  src={authorizedSealUrl}
                  alt="Seal"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div
              className="text-center flex-1 flex flex-col justify-center relative z-10"
              style={{ color: fontColor }}
            >
              <div
                className="text-sm uppercase tracking-[0.3em] font-semibold mb-6"
                style={{ color: primaryColor }}
              >
                {orgName || defaultOrgName}
              </div>

              <div className="text-5xl font-serif mb-8 tracking-wider">
                {customText}
              </div>

              <div className="text-sm opacity-80 mb-4 uppercase tracking-widest">
                Proudly presented to
              </div>
              <div
                className="text-4xl mb-6 italic"
                style={{ color: primaryColor, fontFamily: "serif" }}
              >
                {studentName}
              </div>

              <div className="text-sm opacity-80 mb-4 uppercase tracking-widest">
                In recognition of outstanding achievement in
              </div>
              <div className="text-2xl font-serif mb-2">
                {qualificationTitle || "Certificate of Excellence"}
              </div>
              <div className="text-lg font-medium opacity-90 mb-2">
                {course.title}
              </div>
              {gradeLevel && (
                <div className="text-md opacity-80 mb-8 italic">
                  Grade Level: {gradeLevel}
                </div>
              )}
            </div>

            <div className="flex justify-between items-end mt-8 relative z-10">
              <div className="text-left" style={{ color: fontColor }}>
                <div className="text-xs opacity-60 font-mono mb-1">
                  No: {certId}
                </div>
                <div className="text-xs opacity-60 font-mono">
                  Date: {dateIssued}
                </div>
              </div>

              {signatureUrl ? (
                <div className="text-center">
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="h-14 object-contain mb-2"
                  />
                  <div
                    className="text-xs uppercase tracking-widest font-bold border-t pt-2"
                    style={{
                      color: fontColor,
                      borderColor: `${primaryColor}40`,
                    }}
                  >
                    Authorized Signature
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div
                    className="h-14 mb-2 border-b w-40 mx-auto"
                    style={{ borderColor: `${primaryColor}40` }}
                  ></div>
                  <div
                    className="text-xs uppercase tracking-widest font-bold"
                    style={{ color: fontColor }}
                  >
                    Authorized Signature
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (layout === "creative") {
      containerClasses =
        "w-full h-full bg-slate-900 p-0 flex relative shadow-xl overflow-hidden transition-all duration-300";
      content = (
        <>
          <div
            className="w-1/3 h-full p-8 flex flex-col justify-between relative z-10"
            style={{ backgroundColor: primaryColor, color: "#ffffff" }}
          >
            <div>
              <div className="text-xs uppercase tracking-widest font-bold opacity-80 mb-2">
                Issued By
              </div>
              <div className="text-lg font-bold leading-tight">
                {orgName || defaultOrgName}
              </div>
            </div>

            {authorizedSealUrl && (
              <div className="w-32 h-32 my-auto opacity-90 mx-auto">
                <img
                  src={authorizedSealUrl}
                  alt="Seal"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div>
              <div className="text-xs opacity-80 font-mono mb-1">
                ID: {certId}
              </div>
              <div className="text-xs opacity-80 font-mono">
                Date: {dateIssued}
              </div>
            </div>
          </div>

          <div
            className="w-2/3 h-full p-12 flex flex-col justify-center relative bg-white z-10"
            style={{ color: fontColor }}
          >
            <div
              className="text-sm font-bold uppercase tracking-wider mb-2"
              style={{ color: primaryColor }}
            >
              Certificate
            </div>
            <div
              className="text-5xl font-black tracking-tighter mb-8 leading-none"
              style={{ color: fontColor }}
            >
              {customText}
            </div>

            <div className="text-sm opacity-60 mb-1 uppercase tracking-wider font-bold">
              Awarded To
            </div>
            <div className="text-3xl font-bold mb-8">{studentName}</div>

            <div className="text-sm opacity-60 mb-1 uppercase tracking-wider font-bold">
              For Completing
            </div>
            <div className="text-xl font-bold mb-1">
              {qualificationTitle || "Certificate of Excellence"}
            </div>
            <div className="text-lg opacity-80 mb-6">{course.title}</div>

            {gradeLevel && (
              <div className="text-sm font-bold mb-8">
                <span className="opacity-60 uppercase tracking-wider">
                  Grade //
                </span>{" "}
                {gradeLevel}
              </div>
            )}

            {signatureUrl ? (
              <div className="mt-auto">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="h-12 object-contain mb-2"
                />
                <div className="text-xs uppercase tracking-wider font-bold opacity-60">
                  Director Signature
                </div>
              </div>
            ) : (
              <div className="mt-auto">
                <div
                  className="h-12 mb-2 border-b w-32"
                  style={{ borderColor: `${primaryColor}40` }}
                ></div>
                <div className="text-xs uppercase tracking-wider font-bold opacity-60">
                  Director Signature
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else {
      containerClasses =
        "w-full h-full bg-[#fafafa] border border-slate-200 p-12 flex flex-col items-center justify-center relative shadow-sm transition-all duration-300";
      content = (
        <>
          {authorizedSealUrl && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-5 pointer-events-none">
              <img
                src={authorizedSealUrl}
                alt="Seal"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="text-center w-full z-10" style={{ color: fontColor }}>
            <div className="text-xs uppercase tracking-widest font-medium opacity-60 mb-12">
              {orgName || defaultOrgName}
            </div>

            <div className="text-sm opacity-50 mb-4 italic">
              is proud to present this
            </div>
            <div
              className="text-3xl sm:text-4xl font-light tracking-wide mb-12"
              style={{ color: primaryColor }}
            >
              {customText}
            </div>

            <div className="text-sm opacity-50 mb-2">to</div>
            <div
              className="text-3xl font-medium mb-12 border-b pb-4 px-12 inline-block"
              style={{ borderColor: `${primaryColor}30` }}
            >
              {studentName}
            </div>

            <div className="text-sm opacity-50 mb-2">
              in recognition of completing
            </div>
            <div className="text-lg font-medium mb-1">
              {qualificationTitle || "Certificate of Excellence"}
            </div>
            <div className="text-md opacity-70 mb-2">{course.title}</div>
            {gradeLevel && (
              <div
                className="text-sm font-medium mt-4 px-3 py-1 border rounded"
                style={{
                  borderColor: `${primaryColor}20`,
                  color: primaryColor,
                  display: "inline-block",
                }}
              >
                {gradeLevel}
              </div>
            )}
          </div>

          <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end z-10">
            <div
              className="text-left text-xs opacity-40"
              style={{ color: fontColor }}
            >
              <div>ID: {certId}</div>
              <div>Date: {dateIssued}</div>
            </div>

            {signatureUrl && (
              <div className="text-right">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="h-10 object-contain ml-auto opacity-80"
                />
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <div
        className={containerClasses}
        style={layout === "classic" ? { borderColor: `${primaryColor}50` } : {}}
      >
        {content}
      </div>
    );
  };

  if (isStudent) {
    if (!config.enabled) {
      return (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          Certificates are not enabled for this course.
        </div>
      );
    }
    if (progress < 100) {
      return (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Certificate Locked
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Complete all modules and assessments (100%) to unlock your
            certificate.
          </p>
          <div className="mt-4 text-2xl font-bold text-indigo-400">
            {progress.toFixed(0)}% Completed
          </div>
        </div>
      );
    }
    return (
      <div className="p-8 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <Award className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Congratulations!
        </h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          You have successfully completed this course and earned your
          certificate.
        </p>
        <div className="mb-8">
          <CertificatePreviewWrapper>
            {renderCertificatePreview()}
          </CertificatePreviewWrapper>
        </div>
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-bold rounded-xl flex items-center justify-center mx-auto transition-colors"
        >
          <Download className="w-5 h-5 mr-2" /> Download Certificate
        </button>
      </div>
    );
  }

  const presetColors = [
    "#4f46e5",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#0f172a",
  ];

  // Admin / Instructor View
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Award className="w-5 h-5 mr-2 text-indigo-400" /> Certificate
          Settings
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition flex items-center shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <Settings className="w-4 h-4 mr-2" /> Edit Design
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-5 space-y-6">
            <label className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-900"
              />
              <span className="text-slate-900 dark:text-white font-medium">
                Enable Certificates for this Course
              </span>
            </label>

            {enabled && (
              <>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex items-center text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
                    <Type className="w-4 h-4 mr-2 text-slate-400" /> Content
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                        Organization Name
                      </label>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full">
                        Auto-picked
                      </span>
                    </div>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Certificate Header Text
                    </label>
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                        Qualification Title
                      </label>
                    </div>
                    <input
                      type="text"
                      value={qualificationTitle}
                      onChange={(e) => setQualificationTitle(e.target.value)}
                      placeholder="e.g. Bachelor of Science"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Grade Level (Optional)
                    </label>
                    <input
                      type="text"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex items-center text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
                    <Layout className="w-4 h-4 mr-2 text-slate-400" /> Design &
                    Layout
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      Layout Style
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        "classic",
                        "modern",
                        "minimal",
                        "elegant",
                        "creative",
                      ].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLayout(l as any)}
                          className={`py-2 px-3 border rounded-lg text-sm font-medium capitalize transition flex-1 min-w-[80px] text-center ${layout === l ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      Theme Color
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setThemeColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${themeColor === color ? "border-slate-900 dark:border-white scale-110" : "border-transparent"} transition`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex items-center text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
                    <Palette className="w-4 h-4 mr-2 text-slate-400" /> Media
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                        Signature
                      </label>
                      <FileUpload
                        label="Upload Signature"
                        accept="image/*"
                        onUpload={(url) => setSignatureUrl(url)}
                      />
                      {signatureUrl && (
                        <img
                          src={signatureUrl}
                          alt="Signature"
                          className="h-12 mt-2 object-contain bg-white rounded p-1 border border-slate-200"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                        Official Seal
                      </label>
                      <FileUpload
                        label="Upload Seal"
                        accept="image/*"
                        onUpload={(url) => setAuthorizedSealUrl(url)}
                      />
                      {authorizedSealUrl && (
                        <img
                          src={authorizedSealUrl}
                          alt="Seal"
                          className="h-12 mt-2 object-contain bg-white rounded p-1 border border-slate-200"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="flex space-x-3 pt-4 sticky bottom-4 z-20">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/30"
              >
                Save Design
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>

          {enabled && (
            <div className="xl:col-span-7">
              <div className="sticky top-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Live Preview
                  </h3>
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                    {layout} layout
                  </div>
                </div>
                <CertificatePreviewWrapper>
                  {renderCertificatePreview()}
                </CertificatePreviewWrapper>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Status
              </div>
              <div
                className={`font-bold text-lg ${config.enabled ? "text-emerald-500" : "text-slate-500"}`}
              >
                {config.enabled ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>
          {config.enabled && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Certificate Preview
              </h3>
              <CertificatePreviewWrapper>
                {renderCertificatePreview()}
              </CertificatePreviewWrapper>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
