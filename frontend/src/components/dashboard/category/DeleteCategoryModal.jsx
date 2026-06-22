import { AlertTriangle } from 'lucide-react';

const COLORS = {
  bg: "#F3F5F9",
  panel: "#ffffff",
  panel2: "#F5F7FB",
  ink: "#1B2536",
  muted: "#6A788D",
  line: "#E7EBF1",
  red: "#E04848",
  redsoft: "#FDECEC",
  shadow: "0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)",
};

const DeleteCategoryModal = ({ isOpen, onClose, onConfirm, category, isLoading }) => {
  if (!isOpen || !category) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: "16px"
    }}>
      <div style={{
        backgroundColor: COLORS.panel,
        borderRadius: "12px",
        boxShadow: COLORS.shadow,
        width: "100%",
        maxWidth: "420px",
        border: `1px solid ${COLORS.line}`
      }}>
        {/* Icon and Title */}
        <div style={{
          padding: "24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          borderBottom: `1px solid ${COLORS.line}`
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            backgroundColor: COLORS.redsoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <AlertTriangle size={24} color={COLORS.red} strokeWidth={2} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: COLORS.ink
            }}>
              Delete Category?
            </h2>
            <p style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: COLORS.muted,
              fontWeight: 500
            }}>
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <div style={{
            backgroundColor: COLORS.panel2,
            border: `1px solid ${COLORS.line}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px"
          }}>
            <p style={{
              margin: "0 0 8px",
              fontSize: "11px",
              fontWeight: 600,
              color: COLORS.muted,
              textTransform: "uppercase",
              letterSpacing: "0.3px"
            }}>
              You are about to delete:
            </p>
            <div style={{
              fontSize: "14px",
              fontWeight: 700,
              color: COLORS.ink,
              marginBottom: "6px",
              wordBreak: "break-word"
            }}>
              {category.name}
            </div>
            {category.subcategory && (
              <div style={{
                fontSize: "12px",
                color: COLORS.muted,
                marginBottom: "6px"
              }}>
                Sub: <span style={{ fontWeight: 600, color: COLORS.ink }}>{category.subcategory}</span>
              </div>
            )}
            <div style={{
              fontSize: "12px",
              color: COLORS.muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {category.description || "No description"}
            </div>
          </div>

          {/* Warnings */}
          <div style={{
            backgroundColor: COLORS.redsoft,
            border: `1px solid ${COLORS.red}33`,
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "24px"
          }}>
            <p style={{
              margin: 0,
              fontSize: "12px",
              color: COLORS.red,
              fontWeight: 500,
              lineHeight: "1.5"
            }}>
              ⚠️ All associated products will be affected. Make sure before proceeding.
            </p>
          </div>

          {/* Actions */}
          <div style={{
            display: "flex",
            gap: "10px"
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel,
                color: COLORS.ink,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel2;
                e.currentTarget.style.borderColor = COLORS.muted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel;
                e.currentTarget.style.borderColor = COLORS.line;
              }}
            >
              Keep It
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                backgroundColor: COLORS.red,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = `0 6px 15px rgba(224,72,72,.3)`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isLoading ? "Deleting..." : "Delete Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCategoryModal;