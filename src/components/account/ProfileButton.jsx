// Header profile button.
//
// Square with rounded corners, showing the user's picture. Falls back to the
// filler image for Guests and for anyone who hasn't uploaded one.

import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import fillerProfilePic from "../../media/filler-profile-pic.png";

export default function ProfileButton({ variant = "desktop" }) {
	const { user } = useAuth();
	const pictureUrl = user?.profile_picture_url || fillerProfilePic;
	const label = user?.username ? `Profile — ${user.username}` : "Profile — Guest";

	return (
		<Link
			to="/profile"
			className={variant === "mobile" ? "header-profile-button-mobile" : "header-profile-button"}
			aria-label={label}
			title={label}
		>
			<img src={pictureUrl} alt="" />
		</Link>
	);
}
