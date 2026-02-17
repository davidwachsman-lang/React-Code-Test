export default function FilesTab() {
  return (
    <div className="files-tab">
      <div className="detail-section">
        <h3>Upload Files</h3>
        <div className="upload-area">
          <input type="file" multiple className="file-input" id="file-upload" />
          <label htmlFor="file-upload" className="file-label">
            <span className="upload-icon">&#128206;</span>
            <span>Click to upload files (estimates, photos, documents)</span>
          </label>
          <button className="btn-primary" style={{ marginTop: '1rem' }}>
            Upload Files
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3>Attached Files</h3>
        <p className="no-files">File upload functionality will be connected to cloud storage.</p>
      </div>
    </div>
  );
}
