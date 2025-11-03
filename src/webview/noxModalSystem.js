/**
 * 🦊 NOX Modal System - Scalable, reusable modal management for all NOX modals
 * Supports: Approvals, Confirmations, Alerts, Custom Modals
 * Designed for enterprise-grade extensibility
 */

class NoxModalSystem {
  constructor() {
    this.modals = new Map(); // modalId -> modal instance
    this.modalStack = []; // Stack for nested modals
    this.modalCounter = 0;
    this.callbacks = new Map(); // modalId -> callback functions
    this.setupStyles();
  }

  /**
   * 🎨 Setup modal styles (injected into webview)
   */
  setupStyles() {
    const style = document.createElement("style");
    style.textContent = `
      /* NOX Modal System Styles */
      .nox-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.2s ease-out;
      }

      .nox-modal-container {
        background: var(--bg-secondary, #1e1e1e);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease-out;
      }

      .nox-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .nox-modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .nox-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .nox-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .nox-modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        color: var(--text-primary, #e0e0e0);
      }

      .nox-modal-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: var(--bg-primary, #121212);
        justify-content: flex-end;
      }

      .nox-modal-button {
        padding: 10px 20px;
        border-radius: 6px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nox-modal-button-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .nox-modal-button-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
      }

      .nox-modal-button-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary, #e0e0e0);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .nox-modal-button-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .nox-modal-button-danger {
        background: rgba(255, 59, 48, 0.2);
        color: #ff3b30;
        border: 1px solid rgba(255, 59, 48, 0.3);
      }

      .nox-modal-button-danger:hover {
        background: rgba(255, 59, 48, 0.3);
      }

      .nox-modal-risk-level {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
      }

      .nox-modal-risk-low {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .nox-modal-risk-medium {
        background: rgba(255, 193, 7, 0.2);
        color: #ffc107;
      }

      .nox-modal-risk-high {
        background: rgba(255, 59, 48, 0.2);
        color: #ff3b30;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 🔐 Show approval modal
   */
  showApprovalModal(options) {
    return new Promise((resolve) => {
      const {
        title = "🦊 Approval Required",
        description = "",
        details = "",
        riskLevel = "medium",
        approveText = "✅ Approve",
        denyText = "❌ Deny",
        detailsText = "📋 View Details",
      } = options;

      const modalId = this.createModal({
        title,
        body: this.createApprovalBody(description, details, riskLevel),
        buttons: [
          {
            text: detailsText,
            type: "secondary",
            onClick: () => this.showDetailsModal(details, modalId),
          },
          {
            text: denyText,
            type: "secondary",
            onClick: () => {
              this.closeModal(modalId);
              resolve(false);
            },
          },
          {
            text: approveText,
            type: "primary",
            onClick: () => {
              this.closeModal(modalId);
              resolve(true);
            },
          },
        ],
      });
    });
  }

  /**
   * ✅ Show confirmation modal
   */
  showConfirmationModal(options) {
    return new Promise((resolve) => {
      const {
        title = "🦊 Confirm Action",
        message = "",
        confirmText = "✅ Confirm",
        cancelText = "❌ Cancel",
      } = options;

      const modalId = this.createModal({
        title,
        body: `<p>${message}</p>`,
        buttons: [
          {
            text: cancelText,
            type: "secondary",
            onClick: () => {
              this.closeModal(modalId);
              resolve(false);
            },
          },
          {
            text: confirmText,
            type: "primary",
            onClick: () => {
              this.closeModal(modalId);
              resolve(true);
            },
          },
        ],
      });
    });
  }

  /**
   * ℹ️ Show info modal
   */
  showInfoModal(options) {
    return new Promise((resolve) => {
      const { title = "ℹ️ Information", message = "", okText = "OK" } = options;

      const modalId = this.createModal({
        title,
        body: `<p>${message}</p>`,
        buttons: [
          {
            text: okText,
            type: "primary",
            onClick: () => {
              this.closeModal(modalId);
              resolve(true);
            },
          },
        ],
      });
    });
  }

  /**
   * 🎨 Create custom modal
   */
  createModal(options) {
    const {
      title = "Modal",
      body = "",
      buttons = [],
      onClose = null,
    } = options;

    const modalId = `modal-${++this.modalCounter}`;

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "nox-modal-overlay";
    overlay.id = `overlay-${modalId}`;

    // Create container
    const container = document.createElement("div");
    container.className = "nox-modal-container";

    // Create header
    const header = document.createElement("div");
    header.className = "nox-modal-header";

    // ✅ SECURITY FIX: Use safe DOM methods instead of innerHTML
    const titleEl = document.createElement("h2");
    titleEl.textContent = title; // Safe: textContent escapes HTML

    const closeBtn = document.createElement("button");
    closeBtn.className = "nox-modal-close";
    closeBtn.textContent = "✕";

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Create body
    const bodyEl = document.createElement("div");
    bodyEl.className = "nox-modal-body";

    // ✅ SECURITY FIX: Only allow DOM elements, not HTML strings
    if (typeof body === "string") {
      // For string body, use textContent (safe) or require pre-sanitized HTML element
      bodyEl.textContent = body;
    } else if (typeof body === "object") {
      bodyEl.appendChild(body);
    }

    // Create footer with buttons
    const footer = document.createElement("div");
    footer.className = "nox-modal-footer";

    buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.className = `nox-modal-button nox-modal-button-${
        btn.type || "secondary"
      }`;
      button.textContent = btn.text;
      button.onclick = () => btn.onClick?.();
      footer.appendChild(button);
    });

    // Assemble modal
    container.appendChild(header);
    container.appendChild(bodyEl);
    container.appendChild(footer);
    overlay.appendChild(container);

    // Close button handler
    header.querySelector(".nox-modal-close").onclick = () => {
      this.closeModal(modalId);
      onClose?.();
    };

    // Overlay click to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeModal(modalId);
        onClose?.();
      }
    };

    document.body.appendChild(overlay);
    this.modals.set(modalId, { overlay, container, options });
    this.modalStack.push(modalId);

    return modalId;
  }

  /**
   * 🔍 Show details modal
   */
  showDetailsModal(details, parentModalId) {
    const detailsBody = document.createElement("div");
    detailsBody.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px;">${details}</pre>`;

    this.createModal({
      title: "📋 Details",
      body: detailsBody,
      buttons: [
        {
          text: "Back",
          type: "primary",
          onClick: () => {
            this.closeModal(this.modalStack[this.modalStack.length - 1]);
          },
        },
      ],
    });
  }

  /**
   * ❌ Close modal
   */
  closeModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.overlay.remove();
      this.modals.delete(modalId);
      this.modalStack = this.modalStack.filter((id) => id !== modalId);
    }
  }

  /**
   * 🔐 Create approval body HTML
   */
  createApprovalBody(description, details, riskLevel) {
    const riskEmoji =
      { low: "🟢", medium: "🟡", high: "🔴" }[riskLevel] || "🟡";
    return `
      <p><strong>${description}</strong></p>
      <div class="nox-modal-risk-level nox-modal-risk-${riskLevel}">
        ${riskEmoji} Risk Level: ${riskLevel.toUpperCase()}
      </div>
    `;
  }
}

// Export for use in webview
if (typeof module !== "undefined" && module.exports) {
  module.exports = NoxModalSystem;
}
