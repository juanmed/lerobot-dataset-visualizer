// Utility to post a message to the parent window with custom URLSearchParams
export function postParentMessageWithParams(
  setParams: (params: URLSearchParams) => void,
) {
  // Use the referrer origin when embedded in an iframe, otherwise fall back to
  // the env-configured origin. Avoids the hard-coded huggingface.co mismatch
  // when the app is deployed on a different domain.
  const envOrigin = process.env.NEXT_PUBLIC_PARENT_ORIGIN;
  const referrerOrigin = document.referrer
    ? new URL(document.referrer).origin
    : null;
  const parentOrigin = envOrigin ?? referrerOrigin ?? "*";
  const searchParams = new URLSearchParams();
  setParams(searchParams);
  window.parent.postMessage(
    { queryString: searchParams.toString() },
    parentOrigin,
  );
}
