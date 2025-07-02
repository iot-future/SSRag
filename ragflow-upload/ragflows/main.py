import glob
import os
from ragflows import api, configs, ragflowdb
from utils import fileutils, timeutils
from pathlib import Path
import time
import hashlib


def get_docs_files() -> list:
    """
    Get all files in the specified directory and its subdirectories.

    This function searches for files with specified extensions in the
    directory specified by `configs.DOC_DIR` and its subdirectories.

    Returns:
        list: A list of file paths.

    Raises:
        ValueError: If the specified directory does not exist.
    """
    if not os.path.exists(configs.DOC_DIR):
        raise ValueError(f"文档目录configs.DOC_DIR（{configs.DOC_DIR}）不存在")

    all_files = []

    for ext in configs.DOC_SUFFIX.split(','):
        # 使用递归通配符 ** 搜索子目录中的文件
        files = glob.glob(f'{configs.DOC_DIR}/**/*.{ext.strip()}', recursive=True)
        all_files.extend(files)

    return all_files


def get_file_hash(file_path) -> str:
    """
    计算文件的MD5哈希值
    
    Args:
        file_path (str): 文件路径
        
    Returns:
        str: 文件的MD5哈希值（前8位）
    """
    try:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()[:8]  # 返回前8位哈希值
    except Exception as e:
        timeutils.print_log(f"计算文件哈希值失败 {file_path}，错误信息：{e}")
        return "unknown"


def generate_unique_filename(file_path) -> str:
    """
    生成唯一的文件名：父文件夹名_原文件名_哈希值.扩展名
    
    Args:
        file_path (str): 原文件路径
        
    Returns:
        str: 新的唯一文件名
    """
    # 获取父文件夹名称
    parent_dir = os.path.basename(os.path.dirname(file_path))

    # 获取原文件名和扩展名
    filename = os.path.basename(file_path)
    name, ext = os.path.splitext(filename)

    # 计算文件哈希值
    file_hash = get_file_hash(file_path)

    # 生成新的文件名：父文件夹名_原文件名_哈希值.扩展名
    new_filename = f"{parent_dir}_{name}_{file_hash}{ext}"

    timeutils.print_log(f"文件名转换: {filename} -> {new_filename}")

    return new_filename


def need_calculate_lines(filepath) -> bool:
    """
    Determine whether the lines of the given file need to be calculated.

    Args:
        filepath (str): The path of the file.

    Returns:
        bool: True if the lines of the file need to be calculated, False otherwise.
    """
    if not filepath:
        return False
    suffix_lst = "txt,md,html".split(",")
    return filepath.split(".")[-1].lower() in suffix_lst


def get_file_lines(file_path) -> int:
    """
    Get the number of lines in a file.

    Args:
        file_path (str): The path of the file.

    Returns:
        int: The number of lines in the file. If an error occurs while
        opening or reading the file, returns 0.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except Exception as e:
        timeutils.print_log(f"打开文件 {file_path} 时出错，错误信息：{e}")
        return 0


def main():
    """主函数，处理文档上传和解析"""

    # 运行前测试数据库连接
    db = ragflowdb.get_db()
    if not db or not db.conn:
        raise Exception("无法连接到数据库，请检查数据库配置是否正确")

    # 运行前测试API连接
    status, msg = api.check_api_url()
    if not status:
        raise Exception(msg)

    # 获取起始文件序号，从1开始计数，更符合非编程用户习惯
    user_config_dir = os.path.join(Path.home(), '.ragflow_upload')
    os.makedirs(user_config_dir, exist_ok=True)
    index_filepath = f"{user_config_dir}/index_{configs.DIFY_DOC_KB_ID}_{configs.KB_NAME}.txt".replace(os.sep, "/")
    start_index = int(fileutils.read(index_filepath) or 1)
    if start_index < 1:
        raise ValueError(f"【起始文件序号】值不能小于1，请改为大于等于1的值，或者删除序号缓存文件：{index_filepath}")
    start_index = 1
    # 使用 glob 模块获取所有文件
    doc_files = get_docs_files() or []

    file_total = len(doc_files)
    if file_total == 0:
        raise ValueError(f"在 {configs.DOC_DIR} 目录下没有找到符合要求文档文件")

        # 检查start_index是否超过文件总数
    if start_index > file_total:
        raise ValueError(
            f"起始文件序号 {start_index} > 文件总数 {file_total}，请修改为正确的序号值，或者删除序号缓存文件：{index_filepath}")

    # 标记是否是首次上传
    is_first_upload = True

    # 打印找到的所有 .md 文件
    for i in range(file_total):

        if i < start_index - 1:
            continue

        file_path = doc_files[i]
        file_path = file_path.replace(os.sep, '/')
        filename = os.path.basename(file_path)
        # 生成唯一的文件名
        unique_filename = generate_unique_filename(file_path)

        timeutils.print_log(f"【{i + 1}/{file_total}】正在处理：{file_path}")

        # 记录文件序号，从1开始计数
        fileutils.save(index_filepath, str(i + 1))

        # 判断文件行数是否小于 目标值
        if need_calculate_lines(file_path):
            file_lines = get_file_lines(file_path)
            if file_lines < configs.DOC_MIN_LINES:
                timeutils.print_log(f"行数低于{configs.DOC_MIN_LINES}，跳过：{file_path}")
                continue

        # 如果文件已存在，则判断是否已经对文件进行了切片解析
        if ragflowdb.exist_name(unique_filename):
            doc_item = ragflowdb.get_doc_item_by_name(unique_filename)
            if configs.ONLY_UPLOAD:
                timeutils.print_log(f"{file_path} 已存在，跳过\n")
            elif doc_item.get('progress') == 1:
                timeutils.print_log(f"{file_path} 已完成切片，跳过\n")
            else:
                timeutils.print_log(f'【文件已存在，但未解析】{file_path}，开始切片并等待解析完毕')
                status = api.parse_chunks_with_check(unique_filename)
                timeutils.print_log(f"{file_path} 切片状态：", status, "\n")
            continue

        # 文件不存在，上传文件=>切片=>解析并等待解析完毕
        response = api.upload_file_to_kb(
            file_path=file_path,
            kb_name=configs.KB_NAME,
            kb_id=configs.DIFY_DOC_KB_ID,
            parser_id=configs.PARSER_ID,
            run="1",
            custom_filename=unique_filename  # 使用唯一文件名
        )
        timeutils.print_log("upload_file_to_kb response:", response)
        if api.is_succeed(response) is False:
            timeutils.print_log(f'{file_path} 上传失败：{response.get("text")}')
            continue

        # 仅上传，跳过切片解析
        if configs.ONLY_UPLOAD:
            continue

        # 如果是首次上传且设置了首次解析等待时间，则等待指定时间
        if is_first_upload and configs.FIRST_PARSE_WAIT_TIME > 0:
            timeutils.print_log(
                f'首次上传成功，已配置【首次上传后解析等待时间】，等待 {configs.FIRST_PARSE_WAIT_TIME} 秒后再进行解析...')
            time.sleep(configs.FIRST_PARSE_WAIT_TIME)
            is_first_upload = False

        # 上传成功，开始切片
        timeutils.print_log(f'{file_path}，开始切片并等待解析完毕')
        doc_id = response.get('data')[0].get('id') if response.get('data') else None
        status = api.parse_chunks_with_check(unique_filename, doc_id)
        timeutils.print_log(file_path, "切片状态：", status, "\n")

    timeutils.print_log('all done')


if __name__ == '__main__':
    main()
