// 1. First, create a barcode printing utility service
// services/barcodeService.js

class BarcodeService {
    constructor() {
        this.API_URL =
            import.meta.VITE_API_URL || 'http://localhost:3000';
    }

    // Generate print-ready barcode HTML for a single item
    generateBarcodeHTML(stockItem) {
        return `
      <div style="
        width: 4in; 
        height: 2in; 
        padding: 0.25in; 
        margin: 0; 
        page-break-after: always;
        border: 1px solid #000;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      ">
        <div style="text-align: center; margin-bottom: 0.1in;">
          <h3 style="margin: 0 0 0.05in 0; font-size: 12px; font-weight: bold;">
            ${stockItem.product?.productName || 'Product'}
          </h3>
          <p style="margin: 0; font-size: 10px; color: #666;">
            SKU: ${stockItem.sku}
          </p>
        </div>
        
        <div style="margin: 0.1in 0;">
          <img 
            src="${this.API_URL}${stockItem.barcodeUrl}" 
            alt="Barcode" 
            style="height: 0.8in; max-width: 3in; object-fit: contain;"
          />
        </div>
        
        <div style="text-align: center; font-size: 10px;">
          <p style="margin: 0 0 0.02in 0;">Price: $${stockItem.sellingPrice?.toFixed(2)}</p>
          <p style="margin: 0; font-weight: bold;">${stockItem.sku}</p>
        </div>
      </div>
    `;
    }

    // Generate HTML for multiple barcodes
    generateMultipleBarcodeHTML(stockItems) {
        const barcodeHTMLs = stockItems.map(item => this.generateBarcodeHTML(item));

        return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Print</title>
          <style>
            @page {
              size: 4in 2in;
              margin: 0;
            }
            
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            
            .print-container {
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${barcodeHTMLs.join('')}
          </div>
          
          <script>
            // Auto-print when page loads
            window.onload = function() {
              window.print();
              // Close window after printing (optional)
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;
    }

    // Print barcodes using window.print()
    async printBarcodes(stockItems) {
        if (!Array.isArray(stockItems)) {
            stockItems = [stockItems];
        }

        try {
            // Wait for barcode images to be generated (give server time)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const printHTML = this.generateMultipleBarcodeHTML(stockItems);

            // Create a new window for printing
            const printWindow = window.open('', '_blank', 'width=800,height=600');

            if (!printWindow) {
                throw new Error('Popup blocked. Please allow popups for barcode printing.');
            }

            printWindow.document.write(printHTML);
            printWindow.document.close();

            // Wait for images to load before printing
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };

            return true;
        } catch (error) {
            console.error('Error printing barcodes:', error);
            throw error;
        }
    }

    // Alternative: Print using iframe (more reliable for some browsers)
    async printBarcodesViaIframe(stockItems) {
        if (!Array.isArray(stockItems)) {
            stockItems = [stockItems];
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const printHTML = this.generateMultipleBarcodeHTML(stockItems);

            // Create invisible iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.top = '-1000px';
            iframe.style.left = '-1000px';
            iframe.style.width = '0';
            iframe.style.height = '0';

            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(printHTML);
            doc.close();

            // Wait for content to load then print
            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow.print();
                    // Remove iframe after printing
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                }, 500);
            };

            return true;
        } catch (error) {
            console.error('Error printing barcodes via iframe:', error);
            throw error;
        }
    }

    // Print individual barcode
    async printSingleBarcode(stockItem) {
        return this.printBarcodes([stockItem]);
    }
}

export default new BarcodeService();