
import { Language, Resolution } from './types';

export const TRIAL_LIMIT = 5;
export const VALID_LICENSE_KEY = "CYBER-AI-2077-PREMIUM";

export const translations = {
  [Language.EN]: {
    // Header
    trialUsesRemaining: 'Free trial uses remaining',
    deviceView: 'Device View',
    desktop: 'Desktop',
    mobile: 'Mobile',
    // Sidebar
    creative: 'Creative',
    history: 'History',
    admin: 'Admin',
    // Creative Tab
    uploadSection: 'Upload Image',
    takePhoto: 'Take Photo',
    uploadFromGallery: 'Upload from Gallery',
    dragDrop: 'Drag & drop your image here',
    promptSection: 'Enter Your Prompt',
    singlePrompt: 'Single Prompt',
    batchPrompt: 'Batch Prompt',
    promptPlaceholder: 'e.g., a cinematic portrait, futuristic city background, neon lights',
    batchPromptPlaceholder: 'One prompt per line...\na cinematic portrait...\nanother creative idea...',
    resolution: 'Choose Output Quality',
    generate: 'Generate',
    generating: 'Generating...',
    // Results
    results: 'Results',
    before: 'Before',
    after: 'After',
    downloadSelected: 'Download in Selected Quality',
    downloadAll: 'Download All (.zip)',
    // History Tab
    filter: 'Filter',
    sort: 'Sort',
    delete: 'Delete',
    clearAll: 'Clear All',
    noHistory: 'No history yet. Start creating!',
    // License Modal
    trialExpired: 'Trial expired. Enter your License Key to continue.',
    enterLicense: 'Enter License Key',
    licenseKey: 'License Key',
    activate: 'Activate',
    cancel: 'Cancel',
    invalidLicense: 'Invalid License Key. Please contact the author.',
    activated: 'License activated successfully!',
  },
  [Language.VI]: {
    // Header
    trialUsesRemaining: 'Lượt dùng thử còn lại',
    deviceView: 'Chế độ xem',
    desktop: 'Máy tính',
    mobile: 'Di động',
    // Sidebar
    creative: 'Sáng tạo',
    history: 'Lịch sử',
    admin: 'Quản trị',
    // Creative Tab
    uploadSection: 'Tải ảnh lên',
    takePhoto: 'Chụp ảnh',
    uploadFromGallery: 'Tải từ thư viện',
    dragDrop: 'Kéo và thả ảnh của bạn vào đây',
    promptSection: 'Nhập mô tả của bạn',
    singlePrompt: 'Prompt đơn',
    batchPrompt: 'Prompt hàng loạt',
    promptPlaceholder: 'vd: chân dung điện ảnh, nền thành phố tương lai, đèn neon',
    batchPromptPlaceholder: 'Mỗi prompt một dòng...\nchân dung điện ảnh...\nmột ý tưởng sáng tạo khác...',
    resolution: 'Chọn chất lượng ảnh đầu ra',
    generate: 'Tạo ảnh',
    generating: 'Đang tạo...',
    // Results
    results: 'Kết quả',
    before: 'Trước',
    after: 'Sau',
    downloadSelected: 'Tải xuống theo chất lượng đã chọn',
    downloadAll: 'Tải tất cả (.zip)',
    // History Tab
    filter: 'Lọc',
    sort: 'Sắp xếp',
    delete: 'Xóa',
    clearAll: 'Xóa tất cả',
    noHistory: 'Chưa có lịch sử. Bắt đầu sáng tạo nào!',
    // License Modal
    trialExpired: 'Dùng thử đã hết. Nhập License Key để tiếp tục.',
    enterLicense: 'Nhập License Key',
    licenseKey: 'License Key',
    activate: 'Kích hoạt',
    cancel: 'Hủy',
    invalidLicense: 'License Key không hợp lệ. Vui lòng liên hệ tác giả.',
    activated: 'Kích hoạt license thành công!',
  },
};

export const RESOLUTION_OPTIONS = [
  { value: Resolution.STANDARD, label: 'Standard (1080p)' },
  { value: Resolution.HD, label: 'HD (2K)' },
  { value: Resolution.FOUR_K, label: '4K' },
  { value: Resolution.EIGHT_K, label: '8K (Ultra)' },
];
