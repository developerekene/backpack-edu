// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage } from "./firebase";

export const uploadFile = async (file: File): Promise<string> => {
  console.log("Mock upload to local storage for testing:", file.name);

  // For videos, use Object URL to prevent crashing localStorage/Base64 limits
  if (file.type.startsWith('video/')) {
    return Promise.resolve(URL.createObjectURL(file));
  }

  // For docs and images, use Base64 so it can be saved in local state/storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
