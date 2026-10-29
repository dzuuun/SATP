ZIP rating exports and the Individual/Institutional report Download PDF buttons
use Chrome's PDF printer to keep text selectable and preserve
the existing report design. The printer loads the same report builder, styles,
fonts and logos as the ratings page. Only the logos remain raster images.

Install Chrome or Chromium on the SATP server. Windows Chrome and Edge, macOS
Chrome, and common Linux Chromium paths are detected automatically. For another
installation, set `SATP_CHROME_PATH` to the browser executable and restart SATP.
Run the server under an account that can launch the browser with its sandbox.

The exporter reuses up to two browser processes with temporary profiles. Each
report reloads the template, prints Letter pages with 10 mm margins, and clears
the page afterward. Idle browsers close after 15 seconds; failed browsers are
discarded. Remote network requests are
blocked in the PDF browser. The authenticated endpoint requires report access,
accepts structured report data, and returns PDFs with caching disabled. At most
two browser exports run concurrently.

Failures include a safe stage code in the API response and the affected teacher
and course in the bulk-export message. Detailed errors remain in the server log.

The export dialog's elapsed clock runs in the user's browser while the server
prints each PDF. The ZIP folder structure and report names stay the same.
