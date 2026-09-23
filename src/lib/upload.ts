// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { storage } from "./firebase";

export const uploadFile = async (file: File): Promise<string> => {
  console.log("Mock upload to local storage for testing:", file.name);

 
  if (file.type.startsWith('video/')) {
    const cloudName = "dt2gk3gcn";
    const uploadPreset = "synod_preset";
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Cloudinary error response:", errText);
        throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
