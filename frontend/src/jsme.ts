export type JSMEApplet = {
  smiles: () => string;
  readGenericMolecularInput: (value: string) => void;
  reset: () => void;
  setCallBack: (name: string, callback: (() => void) | null) => void;
};

type JSMELibrary = {
  JSME: new (id: string, width: string, height: string, options: object) => JSMEApplet;
};

declare global {
  interface Window {
    JSApplet?: JSMELibrary;
    jsmeOnLoad?: () => void;
  }
}

let loading: Promise<JSMELibrary> | undefined;
let library: JSMELibrary | undefined;

// JSME loads additional resources after its entry script, so wait for its callback.
export function loadJsme(): Promise<JSMELibrary> {
  if (library) return Promise.resolve(library);
  if (loading) return loading;
  loading = new Promise<JSMELibrary>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("JSME could not be loaded"));
    };
    const timer = window.setTimeout(fail, 25000);
    window.jsmeOnLoad = () => {
      if (settled || !window.JSApplet) return;
      settled = true;
      window.clearTimeout(timer);
      library = window.JSApplet;
      resolve(library);
    };
    script.async = true;
    script.src = "https://jsme-editor.github.io/dist/jsme/jsme.nocache.js";
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch(error => {
    loading = undefined;
    throw error;
  });
  return loading;
}
