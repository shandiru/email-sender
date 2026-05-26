import React, { useState, useRef } from 'react';

const API_URL = 'https://email-sender-ogss.vercel.app/api';

function App() {
  const [file, setFile] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      if (extension === 'xlsx' || extension === 'xls') {
        setFile(selectedFile);
        setMessage({ type: '', text: '' });
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid Excel file (.xlsx or .xls)' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setEmails(data.emails);
        setSelectedEmails(data.emails);
        setMessage({
          type: 'success',
          text: `Successfully extracted ${data.count} email(s) from the Excel file`
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to process file' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...emails]);
    }
  };

  const handleEmailToggle = (email) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const handleSendEmails = async () => {
    if (selectedEmails.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one email address' });
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Please provide both subject and body for the email' });
      return;
    }

    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails: selectedEmails,
          subject: subject,
          body: body
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully sent ${data.totalSent} email(s). ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`
        });
        setSubject('');
        setBody('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send emails' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const getMessageClass = () => {
    if (message.type === 'success') return 'bg-green-100 border-green-500 text-green-700';
    if (message.type === 'error') return 'bg-red-100 border-red-500 text-red-700';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Excel Email Extractor & Sender
          </h1>
          <p className="text-gray-600">
            Upload an Excel file to extract emails and send bulk emails
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 border-l-4 rounded ${getMessageClass()}`}>
            {message.text}
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 1: Upload Excel File</h2>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />
            {file ? (
              <div className="text-blue-600">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">Click to change file</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium">Click to upload Excel file</p>
                <p className="text-sm">Supports .xlsx and .xls files</p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className={`mt-4 w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              loading || !file
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : 'Extract Emails'}
          </button>
        </div>

        {/* Email List Section */}
        {emails.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Step 2: Extracted Emails ({selectedEmails.length}/{emails.length})
              </h2>
              <button
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedEmails.length === emails.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      Select
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emails.map((email, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(email)}
                          onChange={() => handleEmailToggle(email)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email Composition Section */}
        {emails.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 3: Compose Email</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter email body"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSendEmails}
                disabled={sending || selectedEmails.length === 0}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  sending || selectedEmails.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {sending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  `Send Email${selectedEmails.length > 1 ? `s (${selectedEmails.length})` : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Excel Email Extractor & Sender &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}

export default App;