import { loadSettings, saveSettings } from "./config.js";

const fields = {
  serviceUrl: document.querySelector("#serviceUrl"),
  extensionAccessToken: document.querySelector("#extensionAccessToken"),
  bindingSheetUrl: document.querySelector("#bindingSheetUrl"),
  allowedDomains: document.querySelector("#allowedDomains")
};

const status = document.querySelector("#status");

loadSettings().then((settings) => {
  fields.serviceUrl.value = settings.serviceUrl;
  fields.extensionAccessToken.value = settings.extensionAccessToken;
  fields.bindingSheetUrl.value = settings.bindingSheetUrl;
  fields.allowedDomains.value = settings.allowedDomains.join("\n");
});

document.querySelector("#save").addEventListener("click", async () => {
  await saveSettings({
    serviceUrl: fields.serviceUrl.value,
    extensionAccessToken: fields.extensionAccessToken.value,
    bindingSheetUrl: fields.bindingSheetUrl.value,
    allowedDomains: fields.allowedDomains.value
  });

  status.textContent = "设置已保存";
});
