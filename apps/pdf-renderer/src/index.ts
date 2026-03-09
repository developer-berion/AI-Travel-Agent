import type { BundleReviewView } from "@alana/domain";

export const buildQuoteHtml = (bundle: BundleReviewView) => `
  <html>
    <body>
      <h1>Alana Travel Quote</h1>
      <p>Active version: v${bundle.activeQuoteVersion}</p>
      <p>Total: ${bundle.currency} ${bundle.totalPrice}</p>
      <p>This placeholder renderer will be replaced by a dedicated HTML to PDF pipeline.</p>
    </body>
  </html>
`;
