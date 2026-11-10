import StarRatings from 'react-star-ratings';
export default function Stars({ rating = 0, onChange, size = '16px' }) {
  return (
    <StarRatings
      rating={Number(rating) || 0}
      changeRating={onChange}
      numberOfStars={5}
      starDimension={size}
      starSpacing="1px"
      starRatedColor="#ffa940"
      starEmptyColor="#ccd6e4"
      starHoverColor="#ffa940"
      name="rating"
    />
  );
}
