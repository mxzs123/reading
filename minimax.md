我的 API 密钥
sk_fb2bcad6d4c773147962acecf8625afef776b628203975741a480a1c632407de

同步语音合成
接口说明
该 API 支持基于文本到语音的同步生成，单次文本传输最大 10000 字符。支持 100+系统音色、复刻音色自主选择；支持音量、语调、语速、输出格式调整；支持按比例混音功能、固定间隔时间控制；支持多种音频规格、格式，包括：mp3, pcm, flac, wav，支持流式输出。
提交长文本语音合成请求后，需要注意的是返回的 url 的有效期为自 url 返回开始的 24 个小时，请注意下载信息的时间。
适用于短句生成、语音聊天、在线社交等场景，耗时短但文本长度限制小于 10000 字符。
请求地址
POST https://tts.aurastd.com/api/v1/tts
请求头
参数名	类型	必填	说明
Content-Type	string	是	固定值: application/json
Authorization	string	是	Bearer 身份验证格式，例如：Bearer your_api_key_here
请求参数
参数名	类型	必填	默认值	说明
text	string	是	-	待合成的文本，长度限制小于 10000 字符，段落切换用换行符替代。
（如需要控制语音中间隔时间，在字间增加 <#x#>,x 单位为秒，支持 0.01-99.99，最多两位小数）。
支持自定义文本与文本之间的语音时间间隔，以实现自定义文本语音停顿时间的效果。
需要注意的是文本间隔时间需设置在两个可以语音发音的文本之间，且不能设置多个连续的时间间隔。
voice_setting	object	是	-	音色设置
audio_setting	object	否	-	音频设置
pronunciation_dict	object	否	-	发音词典
timbre_weights	array	与voice_id二选一	-	音色权重数组
数组项属性：
voice_id: string - 请求的音色id，须和weight参数同步填写
weight: int - 权重，范围[1,100]，须与voice_id同步填写
最多支持4种音色混合，取值为整数，单一音色取值占比越高，合成音色越像
stream	boolean	否	false	是否流式。默认false，即不开启流式
stream_options	object	否	-	流式选项
exclude_aggregated_audio: boolean - 默认false
当本参数设置为True时，在流式的最后一个chunk中，将不包含拼接后的完整语音hex数据。默认为False，即最后一个chunk中包含拼接后的完整语音hex数据
language_boost	string	否	null	增强对指定的小语种和方言的识别能力，设置后可以提升在指定小语种/方言场景下的语音表现。如果不明确小语种类型，则可以选择"auto"，模型将自主判断小语种类型。
支持以下取值：
'Chinese', 'Chinese,Yue', 'English', 'Arabic', 'Russian', 'Spanish', 'French', 'Portuguese', 'German', 'Turkish', 'Dutch', 'Ukrainian', 'Vietnamese', 'Indonesian', 'Japanese', 'Italian', 'Korean', 'Thai', 'Polish', 'Romanian', 'Greek', 'Czech', 'Finnish', 'Hindi', 'auto'
output_format	string	否	hex	控制输出结果形式的参数。可选值为 url hex。默认值为 hex。
该参数仅在非流式场景生效，流式场景仅支持返回 hex 形式。
返回的 url 有效期为 24 小时。
voice_modify	object	否	-	声音效果器设置
该参数支持的音频格式：
非流式：mp3, wav, flac
流式：mp3
属性：
pitch: integer - 音高调整（低沉/明亮），范围 [-100,100]，数值接近 -100，声音更低沉；接近 100，声音更明亮
intensity: integer - 强度调整（力量感/柔和），范围 [-100,100]，数值接近 -100，声音更刚劲；接近 100，声音更轻柔
timbre: integer - 音色调整（磁性/清脆），范围 [-100,100]，数值接近 -100，声音更浑厚；数值接近 100，声音更清脆
sound_effects: string - 音效设置，单次仅能选择一种，可选值：
spacious_echo（空旷回音）
auditorium_echo（礼堂广播）
lofi_telephone（电话失真）
robotic（电音）
响应参数
参数名	类型	说明
audio	string	合成后的音频片段，采用 hex 编码，按照输入定义的格式 (audio_setting.format) 进行生成（mp3/pcm/flac）。
返回形式根据 output_format 的定义返回，stream 为 true 时只支持 hex 的返回形式。
status	number	当前音频流状态，仅 stream 为 true 时返回。
1 表示合成中，2 表示合成结束。
请求示例
curl -X POST 'https://tts.aurastd.com/api/v1/tts' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your_api_key_here' \
  -d '{
  "model": "speech-2.6-turb",
  "text": "Omg, the real danger is not that computers start thinking like people, but that people start thinking like computers. Computers can only help us with simple tasks.",
  "stream": false,
  "language_boost": "auto",
  "output_format": "url",
  "voice_setting": {
    "voice_id": "English_expressive_narrator",
    "speed": 1,
    "vol": 1,
    "pitch": 0
  },
  "pronunciation_dict": {
    "tone": [
      "Omg/Oh my god"
    ]
  },
  "audio_setting": {
    "sample_rate": 32000,
    "bitrate": 128000,
    "format": "mp3",
    "channel": 1
  },
  "voice_modify": {
    "pitch": 0,
    "intensity": 0,
    "timbre": 0,
    "sound_effects": "spacious_echo"
  }
}'
成功响应示例
{
  "audio": "49443303000000000176...",
  "status": 2
}
音色复刻 API 文档
接口说明
本接口支持单、双声道复刻声音，支持按照指定音频文件快速复刻相同音色的语音。
本接口产出的快速复刻音色为临时音色，如您希望永久保留某复刻音色，请于 168 小时（7 天）内在语音合成接口中调用该音色（不包含本接口内的试听行为）；否则，该音色将被删除。
本接口适用场景：IP 复刻、音色克隆等需要快速复刻某一音色的相关场景。
说明：
* 上传的音频文件格式需为：mp3、m4a、wav 格式；
* 上传的音频文件的时长最少应不低于 10 秒，最长应不超过 5 分钟；
* 上传的音频文件大小需不超过 20mb。
请求地址
POST https://tts.aurastd.com/api/v1/voice-clone
请求头
参数名	类型	必填	说明
Content-Type	string	是	固定值: application/json
Authorization	string	是	Bearer 身份验证格式，例如：Bearer your_api_key_here
请求参数
参数名	类型	必填	默认值	说明
audio_url	string	是	-	需要复刻音色的音频文件 url。支持 mp3、m4a、wav 格式。
text	string	否	-	复刻试听参数。模型将使用复刻后的音色念诵本段文本内容，并以链接的形式将音频合成结果返回，供试听复刻效果。限制 2000 字符以内。
注：试听将根据字符数正常收取语音合成费用。
model	string	传text时必填	-	复刻试听参数。指定试听使用的语音模型。
可选项：speech-02-hd, speech-02-turbo, speech-2.5-hd-preview, speech-2.5-turbo-preview
accuracy	float	否	0.7	音频复刻参数。取值范围[0,1]。上传该字段会设置文本校验准确率阈值。
need_noise_reduction	bool	否	false	音频复刻参数。是否开启降噪。
need_volume_normalization	bool	否	false	音频复刻参数。是否开启音量归一化。
响应参数
参数名	类型	说明
demo_audio_url	string	如果请求体中传入了试听文本 text 以及试听模型 model，那么本参数将以链接形式返回试听音频。
voice_id	string	生成的 voice_id
请求示例
curl -X POST 'https://tts.aurastd.com/api/v1/voice-clone' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your_api_key_here' \
  -d '{
    "audio_url": "https://example.com/voice.mp3",
    "text": "近年来，人工智能在国内迎来高速发展期...",
    "model": "speech-01-hd",
    "need_noise_reduction": true,
    "need_volume_normalization": true
  }'
成功响应示例
{
  "demo_audio_url": "https://demo.com/audio.mp3",
  "voice_id": "xxxxxxx"
}
