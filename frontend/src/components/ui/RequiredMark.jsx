/** Red asterisk appended to a field label when it's required. */
export default function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-danger-solid">
      {" "}
      *
    </span>
  );
}
