const avatars = [
  { id: 'male-01', name: 'Образ 1', gender: 'male', url: '/images/avatars/male-01-base.jpg' },
  { id: 'male-02', name: 'Образ 2', gender: 'male', url: '/images/avatars/male-02-base.jpg' },
  { id: 'female-01', name: 'Образ 1', gender: 'female', url: '/images/avatars/female-01-base.jpg' },
  { id: 'female-02', name: 'Образ 2', gender: 'female', url: '/images/avatars/female-02-base.jpg' },
]

export async function listAvatars() {
  return { avatars }
}
