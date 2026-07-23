type DoctolibIconProps = {
  className?: string;
};

export function DoctolibIcon({ className }: DoctolibIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.doctolib.de/icon_patient/180x180.png"
      alt=""
      width={20}
      height={20}
      className={className}
      aria-hidden="true"
    />
  );
}
