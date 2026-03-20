// Affiliate link generators for lodging, activities, and dining
// Replace placeholder IDs once ROM signs up for each affiliate program

export function getAirbnbSearchUrl(destination, checkin, checkout, adults = 2, children = 0) {
  const params = new URLSearchParams({
    checkin: checkin || "",
    checkout: checkout || "",
    adults: String(adults),
  });
  if (children > 0) params.set("children", String(children));
  // Add affiliate tag once enrolled: &tag=rom-20 or similar
  return `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes?${params.toString()}`;
}

export function getBookingSearchUrl(destination, checkin, checkout) {
  const params = new URLSearchParams({
    ss: destination,
  });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  // Add affiliate ID once enrolled: &aid=XXXXXX
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

export function getViatorSearchUrl(destination) {
  return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`;
}

export function getGoogleMapsLink(name, destination) {
  return `https://www.google.com/maps/search/${encodeURIComponent(name + " " + destination)}`;
}
