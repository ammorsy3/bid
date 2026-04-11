export async function downloadAuthenticatedFile(fileUrl: string, filename?: string) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || getFilenameFromUrl(fileUrl);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}

export async function viewAuthenticatedFile(fileUrl: string) {
  // Open window immediately on user click so browser doesn't block popup
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error("Popup blocked — please allow popups for this site");
  }
  win.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666">Loading file...</body></html>');

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      win.close();
      throw new Error("Authentication required");
    }

    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      win.close();
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType });
    const url = window.URL.createObjectURL(blob);

    win.location.href = url;
  } catch (error) {
    console.error("View error:", error);
    throw error;
  }
}

function getFilenameFromUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] || "download";
}
