// Debounced live username availability check.
//
// Format is validated locally first so obviously-invalid input never costs a
// request (the endpoint is rate-limited). The server's answer is authoritative —
// only it knows about reserved names and other accounts.

import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailable } from "../API/auth";
import { getUsernameFormatError, getUsernameUnavailableMessage } from "./validation";

const DEBOUNCE_MS = 450;

export function useUsernameAvailability(username) {
	const [status, setStatus] = useState("idle");
	const [message, setMessage] = useState("");
	// Guards against an earlier, slower response overwriting a later one.
	const requestIdRef = useRef(0);

	useEffect(() => {
		const trimmed = (username || "").trim();

		if (trimmed.length === 0) {
			setStatus("idle");
			setMessage("");
			return undefined;
		}

		const formatError = getUsernameFormatError(trimmed);
		if (formatError) {
			setStatus("invalid");
			setMessage(formatError);
			return undefined;
		}

		setStatus("checking");
		setMessage("Checking availability…");

		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;

		const timeoutId = setTimeout(async () => {
			try {
				const result = await checkUsernameAvailable(trimmed);
				if (requestIdRef.current !== requestId) return;
				if (result?.available) {
					setStatus("available");
					setMessage(`${trimmed} is available!`);
				} else {
					setStatus("unavailable");
					setMessage(getUsernameUnavailableMessage(result?.reason));
				}
			} catch {
				if (requestIdRef.current !== requestId) return;
				// A failed check shouldn't block signup — the server validates again
				// on register and will reject a taken name there.
				setStatus("error");
				setMessage("Couldn't check that username right now.");
			}
		}, DEBOUNCE_MS);

		return () => clearTimeout(timeoutId);
	}, [username]);

	return {
		status,
		message,
		isAvailable: status === "available",
		isChecking: status === "checking",
	};
}
