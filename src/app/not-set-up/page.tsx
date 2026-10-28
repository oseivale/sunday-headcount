export default function NotSetUp() {
  return (
    <main className="wrap">
      <div className="login stack">
        <h1>Almost there</h1>
        <p className="lede">You&apos;re signed in, but your account isn&apos;t linked to a church yet. Ask an admin to add you in Settings.</p>
        <form action="/auth/signout" method="post">
          <button className="btn">Sign out</button>
        </form>
      </div>
    </main>
  )
}
