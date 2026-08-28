// "Update picture" for Trailblazers.
//
// Offers 8 complimentary pictures plus an "upload your own" fallback. The
// complimentary set needs no moderation, so picking one applies immediately;
// uploading a custom image still goes through the existing review flow, so
// this just hands off to it.

import { useState } from "react";
import Modal from "../ui/Modal";
import { selectProfilePicture } from "../../API/auth";
import { getUserMessage } from "../../API/errors";

// Served from /profile-picture-presets/ in public/ -- NOT imported from
// src/media -- so the URL is stable across builds. Vite fingerprints
// imported assets with a content hash that changes every deploy; the backend
// stores the URL it gets back from a pick permanently on the user's account,
// so that URL has to keep working after the next frontend deploy too. The id
// in each entry is the key the backend's PROFILE_PICTURE_PRESETS allowlist
// (app/api/users.py) resolves, and the filename must match what's in public/.
const PROFILE_PICTURE_PRESETS = [
	{ id: "guest-filler-profile-pic", src: "/profile-picture-presets/guest-filler-profile-pic.png", label: "Mimic" },
	{ id: "filler-profile-pic", src: "/profile-picture-presets/filler-profile-pic.png", label: "Wizard" },
	{ id: "profile-pic-option-fairy", src: "/profile-picture-presets/profile-pic-option-fairy.png", label: "Fairy" },
	{ id: "profile-pic-option-gryphon", src: "/profile-picture-presets/profile-pic-option-gryphon.png", label: "Gryphon" },
	{ id: "profile-pic-option-knight", src: "/profile-picture-presets/profile-pic-option-knight.png", label: "Knight" },
	{ id: "profile-pic-option-mermaid", src: "/profile-picture-presets/profile-pic-option-mermaid.png", label: "Mermaid" },
	{ id: "profile-pic-option-ogre", src: "/profile-picture-presets/profile-pic-option-ogre.png", label: "Ogre" },
	{ id: "profile-pic-option-unicorn", src: "/profile-picture-presets/profile-pic-option-unicorn.png", label: "Unicorn" },
];

export default function ProfilePictureModal({ isOpen, onClose, onPictureSelected, onUploadOwn }) {
	const [pendingId, setPendingId] = useState(null);
	const [error, setError] = useState(null);

	const handlePick = async (preset) => {
		setError(null);
		setPendingId(preset.id);
		try {
			const result = await selectProfilePicture(preset.id);
			onPictureSelected?.(result?.profile_picture_url ?? preset.src);
			onClose?.();
		} catch (submitError) {
			setError(getUserMessage(submitError));
		} finally {
			setPendingId(null);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Choose a profile picture" size="medium">
			<p>Pick one of these complimentary pictures — no review needed, it's yours right away.</p>

			{error ? <p className="som-form-error">{error}</p> : null}

			<div className="profile-picture-grid">
				{PROFILE_PICTURE_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						className="profile-picture-option"
						disabled={pendingId !== null}
						onClick={() => handlePick(preset)}
					>
						<img src={preset.src} alt={preset.label} />
						<span>{pendingId === preset.id ? "Applying…" : preset.label}</span>
					</button>
				))}
			</div>

			<div className="profile-picture-upload-own">
				<p>Or upload your own — new uploads go to a quick moderator review first.</p>
				<button
					type="button"
					className="som-btn som-btn-secondary"
					disabled={pendingId !== null}
					onClick={() => {
						onClose?.();
						onUploadOwn?.();
					}}
				>
					Upload your own
				</button>
			</div>
		</Modal>
	);
}
